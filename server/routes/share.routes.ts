import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, ShareLink } from '../db';
import { authenticateUser, AuthRequest } from '../auth';
import { generateSecureToken } from '../crypto';

const router = Router();

// Create new share link for existing file
router.post('/create', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      fileId,
      recipientEmail,
      password,
      expiryHours,
      customExpiry,
      maxAccessCount,
      downloadAllowed,
      watermarkEnabled,
      autoRevokeOnSuspicious,
      requireOtp,
    } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    const file = db.getFileById(fileId);
    if (!file || file.userId !== user.id) {
      return res.status(404).json({ error: 'File not found or permission denied' });
    }

    // Expiry calculation
    let expiresAt: string | null = null;
    if (customExpiry) {
      expiresAt = new Date(customExpiry).toISOString();
    } else if (expiryHours && Number(expiryHours) > 0) {
      const hours = Number(expiryHours);
      expiresAt = new Date(Date.now() + hours * 3600000).toISOString();
    } else if (expiryHours === '0.166') {
      expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
    }

    // Password
    let passwordHash: string | undefined = undefined;
    const isPasswordProtected = Boolean(password && password.trim().length > 0);
    if (isPasswordProtected) {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const token = generateSecureToken(16);
    const newShare: ShareLink = {
      id: `sh_${crypto.randomBytes(8).toString('hex')}`,
      token,
      fileId: file.id,
      userId: user.id,
      recipientEmail: recipientEmail ? recipientEmail.trim().toLowerCase() : undefined,
      isPasswordProtected,
      passwordHash,
      otpRequired: requireOtp === 'true' || requireOtp === true,
      expiresAt,
      maxAccessCount: Number(maxAccessCount) || 0,
      accessCount: 0,
      downloadAllowed: downloadAllowed === 'true' || downloadAllowed === true || downloadAllowed === undefined,
      watermarkEnabled: watermarkEnabled === 'true' || watermarkEnabled === true,
      autoRevokeOnSuspicious: autoRevokeOnSuspicious !== 'false' && autoRevokeOnSuspicious !== false,
      isRevoked: false,
      createdAt: new Date().toISOString(),
    };

    db.createShareLink(newShare);

    return res.status(201).json({
      shareLink: newShare,
      file,
      shareUrl: `/share/${newShare.token}`,
    });
  } catch (err: any) {
    console.error('Create share link error:', err);
    return res.status(500).json({ error: 'Failed to create share link' });
  }
});

// List all share links for user
router.get('/', authenticateUser, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const links = db.getShareLinksByUserId(user.id);
  const files = db.getFilesByUserId(user.id);
  const fileMap = new Map(files.map(f => [f.id, f]));

  const enriched = links.map(link => {
    const file = fileMap.get(link.fileId);
    const now = Date.now();
    const isExpired = link.expiresAt ? new Date(link.expiresAt).getTime() < now : false;
    const isLimitReached = link.maxAccessCount > 0 && link.accessCount >= link.maxAccessCount;
    
    let status: 'active' | 'revoked' | 'expired' | 'limit_reached' = 'active';
    if (link.isRevoked) status = 'revoked';
    else if (isExpired) status = 'expired';
    else if (isLimitReached) status = 'limit_reached';

    return {
      ...link,
      passwordHash: undefined, // never send hash
      fileName: file?.originalName || 'Deleted File',
      fileSize: file?.size || 0,
      fileMimeType: file?.mimeType || 'unknown',
      status,
      isExpired,
      isLimitReached,
    };
  });

  return res.json(enriched);
});

// Get Single Share Link Details & Recent Logs
router.get('/:id', authenticateUser, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const link = db.getShareLinkById(req.params.id);

  if (!link || link.userId !== user.id) {
    return res.status(404).json({ error: 'Share link not found' });
  }

  const file = db.getFileById(link.fileId);
  const logs = db.getAccessLogsByShareId(link.id);

  const now = Date.now();
  const isExpired = link.expiresAt ? new Date(link.expiresAt).getTime() < now : false;
  const isLimitReached = link.maxAccessCount > 0 && link.accessCount >= link.maxAccessCount;

  return res.json({
    shareLink: {
      ...link,
      passwordHash: undefined,
      isExpired,
      isLimitReached,
    },
    file,
    logs,
  });
});

// Revoke Link Instantly
router.post('/:id/revoke', authenticateUser, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const link = db.getShareLinkById(req.params.id);

  if (!link || link.userId !== user.id) {
    return res.status(404).json({ error: 'Share link not found' });
  }

  const updated = db.updateShareLink(link.id, {
    isRevoked: true,
    revokedAt: new Date().toISOString(),
    autoRevokedReason: 'Manually revoked by owner',
  });

  db.createNotification({
    id: `notif_${crypto.randomBytes(6).toString('hex')}`,
    userId: user.id,
    title: 'Link Revoked',
    message: `Share token ${link.token.slice(0, 8)}... has been permanently invalidated.`,
    type: 'warning',
    timestamp: new Date().toISOString(),
    read: false,
  });

  return res.json({ message: 'Link revoked successfully', shareLink: updated });
});

// Update Share Link (Change Expiry / Limit / Password)
router.post('/:id/update', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const link = db.getShareLinkById(req.params.id);

    if (!link || link.userId !== user.id) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    const {
      expiryHours,
      customExpiry,
      maxAccessCount,
      downloadAllowed,
      watermarkEnabled,
      password,
      removePassword,
      autoRevokeOnSuspicious,
      isRevoked,
    } = req.body;

    const updates: Partial<ShareLink> = {};

    if (customExpiry !== undefined) {
      updates.expiresAt = customExpiry ? new Date(customExpiry).toISOString() : null;
    } else if (expiryHours !== undefined) {
      if (expiryHours === null || Number(expiryHours) <= 0) {
        updates.expiresAt = null;
      } else {
        updates.expiresAt = new Date(Date.now() + Number(expiryHours) * 3600000).toISOString();
      }
    }

    if (maxAccessCount !== undefined) {
      updates.maxAccessCount = Number(maxAccessCount) || 0;
    }

    if (downloadAllowed !== undefined) {
      updates.downloadAllowed = Boolean(downloadAllowed);
    }

    if (watermarkEnabled !== undefined) {
      updates.watermarkEnabled = Boolean(watermarkEnabled);
    }

    if (autoRevokeOnSuspicious !== undefined) {
      updates.autoRevokeOnSuspicious = Boolean(autoRevokeOnSuspicious);
    }

    if (isRevoked !== undefined) {
      updates.isRevoked = Boolean(isRevoked);
      if (updates.isRevoked) {
        updates.revokedAt = new Date().toISOString();
      } else {
        updates.revokedAt = null;
      }
    }

    if (removePassword) {
      updates.isPasswordProtected = false;
      updates.passwordHash = undefined;
    } else if (password && password.trim().length > 0) {
      updates.isPasswordProtected = true;
      updates.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const updated = db.updateShareLink(link.id, updates);
    return res.json({ message: 'Share link updated successfully', shareLink: updated });
  } catch (err) {
    console.error('Update share link error:', err);
    return res.status(500).json({ error: 'Failed to update share link' });
  }
});

// Delete Share Link
router.delete('/:id', authenticateUser, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const success = db.deleteShareLink(req.params.id, user.id);

  if (!success) {
    return res.status(404).json({ error: 'Share link not found' });
  }

  return res.json({ message: 'Share link removed successfully' });
});

export default router;
