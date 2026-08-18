import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db, UPLOADS_DIR, ShareLink, FileRecord } from '../db';
import { decryptBuffer, generateOTP, generateSvgWatermark } from '../crypto';
import { generateShareAccessToken, verifyShareAccessToken } from '../auth';

const router = Router();

// In-memory failed attempt tracking to detect brute force (token -> { count, lastAttempt })
const failedAttemptsMap = new Map<string, { count: number; lastAttempt: number }>();

function parseClientDetails(req: Request) {
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown Client';
  
  let deviceType = 'Desktop';
  if (/mobile/i.test(userAgent)) deviceType = 'Mobile';
  else if (/tablet|ipad/i.test(userAgent)) deviceType = 'Tablet';
  else if (/bot|spider|crawler|curl|wget|python/i.test(userAgent)) deviceType = 'Bot / Script';

  let browser = 'Unknown';
  if (/chrome/i.test(userAgent) && !/edg|opr/i.test(userAgent)) browser = 'Chrome';
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
  else if (/firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/edg/i.test(userAgent)) browser = 'Edge';
  else if (/curl|python/i.test(userAgent)) browser = 'Automated CLI';

  return { ipAddress, userAgent, deviceType, browser };
}

// 1. Get Share Link Metadata & Status
router.get('/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  const link = db.getShareLinkByToken(token);

  if (!link) {
    return res.status(404).json({
      error: 'Share link not found or invalid token',
      code: 'NOT_FOUND',
    });
  }

  const file = db.getFileById(link.fileId);
  if (!file) {
    return res.status(404).json({
      error: 'The shared file was deleted or is unavailable',
      code: 'FILE_DELETED',
    });
  }

  const now = Date.now();
  const isExpired = link.expiresAt ? new Date(link.expiresAt).getTime() < now : false;
  const isLimitReached = link.maxAccessCount > 0 && link.accessCount >= link.maxAccessCount;

  if (link.isRevoked) {
    return res.status(410).json({
      error: 'This share link has been revoked by the owner for security reasons.',
      code: 'LINK_REVOKED',
      revokedAt: link.revokedAt,
      reason: link.autoRevokedReason || 'Revoked by owner',
    });
  }

  if (isExpired) {
    // Log expired block
    const client = parseClientDetails(req);
    db.createAccessLog({
      id: `log_${crypto.randomBytes(6).toString('hex')}`,
      shareLinkId: link.id,
      fileId: file.id,
      ownerUserId: link.userId,
      timestamp: new Date().toISOString(),
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
      deviceType: client.deviceType,
      browser: client.browser,
      action: 'expired_blocked',
      status: 'blocked',
      isSuspicious: false,
    });

    return res.status(410).json({
      error: 'This secure share link has expired.',
      code: 'LINK_EXPIRED',
      expiresAt: link.expiresAt,
    });
  }

  if (isLimitReached) {
    const client = parseClientDetails(req);
    db.createAccessLog({
      id: `log_${crypto.randomBytes(6).toString('hex')}`,
      shareLinkId: link.id,
      fileId: file.id,
      ownerUserId: link.userId,
      timestamp: new Date().toISOString(),
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
      deviceType: client.deviceType,
      browser: client.browser,
      action: 'limit_blocked',
      status: 'blocked',
      isSuspicious: false,
    });

    return res.status(410).json({
      error: 'Maximum access count limit has been reached for this file.',
      code: 'LIMIT_REACHED',
      maxAccessCount: link.maxAccessCount,
      accessCount: link.accessCount,
    });
  }

  // Safe response for recipient preview portal
  return res.json({
    token: link.token,
    fileName: file.originalName,
    fileSize: file.size,
    mimeType: file.mimeType,
    checksumSha256: file.checksumSha256,
    encryptionAlgorithm: file.encryptionAlgorithm,
    isPasswordProtected: link.isPasswordProtected,
    otpRequired: link.otpRequired,
    recipientEmail: link.recipientEmail ? maskEmail(link.recipientEmail) : null,
    expiresAt: link.expiresAt,
    maxAccessCount: link.maxAccessCount,
    accessCount: link.accessCount,
    downloadAllowed: link.downloadAllowed,
    watermarkEnabled: link.watermarkEnabled,
    requiresAuth: link.isPasswordProtected || link.otpRequired,
  });
});

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : `${user[0]}*`;
  return `${maskedUser}@${domain}`;
}

// 2. Verify Password
router.post('/:token/verify-password', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password, recipientEmail } = req.body;
  const client = parseClientDetails(req);

  const link = db.getShareLinkByToken(token);
  if (!link || link.isRevoked) {
    return res.status(404).json({ error: 'Share link not available' });
  }

  const file = db.getFileById(link.fileId);
  if (!file) return res.status(404).json({ error: 'File unavailable' });

  // If email restriction is in place
  if (link.recipientEmail && recipientEmail) {
    if (link.recipientEmail.toLowerCase() !== recipientEmail.trim().toLowerCase()) {
      return res.status(403).json({ error: 'This link is restricted to a different recipient email address.' });
    }
  }

  if (!link.isPasswordProtected) {
    const accessToken = generateShareAccessToken(link.id, link.token, recipientEmail);
    return res.json({ success: true, accessToken });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const isMatch = await bcrypt.compare(password, link.passwordHash || '');
  
  if (!isMatch) {
    // Track failed attempts
    const attempts = failedAttemptsMap.get(token) || { count: 0, lastAttempt: 0 };
    attempts.count += 1;
    attempts.lastAttempt = Date.now();
    failedAttemptsMap.set(token, attempts);

    const isSuspicious = attempts.count >= 3;
    const suspiciousReason = isSuspicious ? `${attempts.count} failed password attempts detected` : undefined;

    db.createAccessLog({
      id: `log_${crypto.randomBytes(6).toString('hex')}`,
      shareLinkId: link.id,
      fileId: file.id,
      ownerUserId: link.userId,
      timestamp: new Date().toISOString(),
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
      deviceType: client.deviceType,
      browser: client.browser,
      action: 'password_attempt',
      status: 'failed',
      recipientEmail,
      isSuspicious,
      suspiciousReason,
    });

    if (isSuspicious) {
      // Create Security Alert
      db.createSecurityAlert({
        id: `alt_${crypto.randomBytes(6).toString('hex')}`,
        userId: link.userId,
        shareLinkId: link.id,
        fileId: file.id,
        level: attempts.count >= 5 ? 'HIGH' : 'MEDIUM',
        title: 'Brute Force Password Attempt Detected',
        description: `${attempts.count} consecutive failed password attempts on "${file.originalName}" from IP ${client.ipAddress} (${client.deviceType}).`,
        timestamp: new Date().toISOString(),
        resolved: false,
        actionTaken: link.autoRevokeOnSuspicious && attempts.count >= 5 ? 'Link automatically revoked' : 'Security alert logged',
      });

      // Auto revoke if configured & attempts >= 5
      if (link.autoRevokeOnSuspicious && attempts.count >= 5) {
        db.updateShareLink(link.id, {
          isRevoked: true,
          revokedAt: new Date().toISOString(),
          autoRevokedReason: 'Auto-revoked due to repeated unauthorized password guesses (brute force mitigation)',
        });
      }

      // Owner notification
      db.createNotification({
        id: `notif_${crypto.randomBytes(6).toString('hex')}`,
        userId: link.userId,
        title: 'Security Alert: Failed Passwords',
        message: `Multiple failed password attempts detected for file "${file.originalName}".`,
        type: 'alert',
        timestamp: new Date().toISOString(),
        read: false,
      });
    }

    return res.status(401).json({
      error: 'Incorrect password provided',
      remainingAttempts: Math.max(0, 5 - attempts.count),
    });
  }

  // Reset failed attempts on success
  failedAttemptsMap.delete(token);

  // If OTP is also required, tell client to proceed to OTP
  if (link.otpRequired) {
    return res.json({
      success: true,
      requiresOtp: true,
      message: 'Password verified. Please proceed to OTP verification.',
    });
  }

  const accessToken = generateShareAccessToken(link.id, link.token, recipientEmail);
  return res.json({
    success: true,
    requiresOtp: false,
    accessToken,
  });
});

// 3. Request OTP Code
router.post('/:token/request-otp', (req: Request, res: Response) => {
  const { token } = req.params;
  const { email } = req.body;

  const link = db.getShareLinkByToken(token);
  if (!link || link.isRevoked) {
    return res.status(404).json({ error: 'Share link not available' });
  }

  const recipientEmail = email || link.recipientEmail;
  if (!recipientEmail) {
    return res.status(400).json({ error: 'Recipient email address is required to dispatch OTP' });
  }

  if (link.recipientEmail && link.recipientEmail.toLowerCase() !== recipientEmail.trim().toLowerCase()) {
    return res.status(403).json({ error: 'Email does not match designated link recipient' });
  }

  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60000).toISOString(); // 10 minutes

  db.createOTP({
    id: `otp_${crypto.randomBytes(6).toString('hex')}`,
    shareLinkId: link.id,
    recipientEmail: recipientEmail.trim().toLowerCase(),
    code: otpCode,
    expiresAt,
    verified: false,
  });

  // Owner notification
  db.createNotification({
    id: `notif_${crypto.randomBytes(6).toString('hex')}`,
    userId: link.userId,
    title: 'OTP Dispatched',
    message: `A verification code was requested by ${recipientEmail} for access.`,
    type: 'info',
    timestamp: new Date().toISOString(),
    read: false,
  });

  // Return OTP preview in JSON for live testing/previewing
  return res.json({
    success: true,
    message: `One-Time Passcode sent to ${recipientEmail}. Valid for 10 minutes.`,
    previewOtpCode: otpCode, // For live interactive sandbox testing!
    expiresAt,
  });
});

// 4. Verify OTP Code
router.post('/:token/verify-otp', (req: Request, res: Response) => {
  const { token } = req.params;
  const { email, code } = req.body;
  const client = parseClientDetails(req);

  const link = db.getShareLinkByToken(token);
  if (!link || link.isRevoked) {
    return res.status(404).json({ error: 'Share link not available' });
  }

  const recipientEmail = email || link.recipientEmail;
  if (!recipientEmail || !code) {
    return res.status(400).json({ error: 'Email and OTP code are required' });
  }

  const isValid = db.verifyOTP(link.id, recipientEmail, code);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid or expired OTP verification code' });
  }

  const accessToken = generateShareAccessToken(link.id, link.token, recipientEmail);
  return res.json({
    success: true,
    accessToken,
    message: 'Identity confirmed via 2-Factor One-Time Passcode',
  });
});

// 5. Decrypted View / Preview
router.get('/:token/view', (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { auth_token, recipient_email } = req.query;
    const client = parseClientDetails(req);

    const link = db.getShareLinkByToken(token);
    if (!link || link.isRevoked) {
      return res.status(404).json({ error: 'Share link not available or revoked' });
    }

    const file = db.getFileById(link.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Validate Expiry
    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ error: 'Share link expired' });
    }

    // Validate Access Limits
    if (link.maxAccessCount > 0 && link.accessCount >= link.maxAccessCount) {
      return res.status(410).json({ error: 'Access count limit reached' });
    }

    // Check Access Token if protected
    if (link.isPasswordProtected || link.otpRequired) {
      if (!auth_token) {
        return res.status(401).json({ error: 'Security authorization token required' });
      }
      const verified = verifyShareAccessToken(auth_token as string);
      if (!verified || verified.token !== token) {
        return res.status(401).json({ error: 'Invalid or expired share access token' });
      }
    }

    // Decrypt file from disk
    const filePath = path.join(UPLOADS_DIR, file.encryptedFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Encrypted storage file not found' });
    }

    const encryptedData = fs.readFileSync(filePath);
    const decrypted = decryptBuffer(encryptedData, file.iv, file.authTag);

    // Increment access count
    db.updateShareLink(link.id, { accessCount: link.accessCount + 1 });

    // Log view action
    db.createAccessLog({
      id: `log_${crypto.randomBytes(6).toString('hex')}`,
      shareLinkId: link.id,
      fileId: file.id,
      ownerUserId: link.userId,
      timestamp: new Date().toISOString(),
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
      deviceType: client.deviceType,
      browser: client.browser,
      action: 'view',
      status: 'success',
      recipientEmail: (recipient_email as string) || link.recipientEmail || 'Anonymous Viewer',
      isSuspicious: false,
    });

    // Notify owner
    db.createNotification({
      id: `notif_${crypto.randomBytes(6).toString('hex')}`,
      userId: link.userId,
      title: 'File Viewed',
      message: `"${file.originalName}" was accessed by ${client.ipAddress} (${client.deviceType}).`,
      type: 'info',
      timestamp: new Date().toISOString(),
      read: false,
    });

    // Set headers
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('X-Decryption-Algorithm', 'AES-256-GCM');
    res.setHeader('X-Watermark-Enabled', link.watermarkEnabled ? 'true' : 'false');

    return res.send(decrypted);
  } catch (err: any) {
    console.error('File view error:', err);
    return res.status(500).json({ error: 'Failed to decrypt and stream file' });
  }
});

// 6. Decrypted Download
router.get('/:token/download', (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { auth_token, recipient_email } = req.query;
    const client = parseClientDetails(req);

    const link = db.getShareLinkByToken(token);
    if (!link || link.isRevoked) {
      return res.status(404).json({ error: 'Share link not available or revoked' });
    }

    if (!link.downloadAllowed) {
      return res.status(403).json({ error: 'Download permission is disabled for this view-only link.' });
    }

    const file = db.getFileById(link.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Validate Expiry
    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ error: 'Share link expired' });
    }

    // Validate Access Limits
    if (link.maxAccessCount > 0 && link.accessCount >= link.maxAccessCount) {
      return res.status(410).json({ error: 'Access count limit reached' });
    }

    // Check Access Token if protected
    if (link.isPasswordProtected || link.otpRequired) {
      if (!auth_token) {
        return res.status(401).json({ error: 'Security authorization token required' });
      }
      const verified = verifyShareAccessToken(auth_token as string);
      if (!verified || verified.token !== token) {
        return res.status(401).json({ error: 'Invalid or expired share access token' });
      }
    }

    const filePath = path.join(UPLOADS_DIR, file.encryptedFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Encrypted storage file not found' });
    }

    const encryptedData = fs.readFileSync(filePath);
    const decrypted = decryptBuffer(encryptedData, file.iv, file.authTag);

    // Increment access count
    db.updateShareLink(link.id, { accessCount: link.accessCount + 1 });

    // Log download action
    db.createAccessLog({
      id: `log_${crypto.randomBytes(6).toString('hex')}`,
      shareLinkId: link.id,
      fileId: file.id,
      ownerUserId: link.userId,
      timestamp: new Date().toISOString(),
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
      deviceType: client.deviceType,
      browser: client.browser,
      action: 'download',
      status: 'success',
      recipientEmail: (recipient_email as string) || link.recipientEmail || 'Authorized Recipient',
      isSuspicious: false,
    });

    // Notify owner
    db.createNotification({
      id: `notif_${crypto.randomBytes(6).toString('hex')}`,
      userId: link.userId,
      title: 'File Downloaded',
      message: `"${file.originalName}" was downloaded by ${client.ipAddress} (${client.browser}).`,
      type: 'success',
      timestamp: new Date().toISOString(),
      read: false,
    });

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Length', decrypted.length);

    return res.send(decrypted);
  } catch (err) {
    console.error('File download error:', err);
    return res.status(500).json({ error: 'Failed to decrypt and download file' });
  }
});

export default router;
