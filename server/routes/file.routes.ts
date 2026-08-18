import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db, FileRecord, ShareLink, UPLOADS_DIR } from '../db';
import { authenticateUser, AuthRequest } from '../auth';
import { encryptBuffer, decryptBuffer, generateSecureToken } from '../crypto';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Upload and Encrypt File
router.post(
  '/upload',
  authenticateUser,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const {
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

      const fileId = `file_${crypto.randomBytes(8).toString('hex')}`;
      const encryptedFileName = `${fileId}.enc`;

      // Encrypt file using AES-256-GCM
      const { encryptedBuffer, iv, authTag, checksumSha256, algorithm } = encryptBuffer(req.file.buffer);

      // Save encrypted file to disk
      const encryptedFilePath = path.join(UPLOADS_DIR, encryptedFileName);
      fs.writeFileSync(encryptedFilePath, encryptedBuffer);

      // Create file database record
      const fileRecord: FileRecord = {
        id: fileId,
        userId: user.id,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype || 'application/octet-stream',
        size: req.file.size,
        encryptedFileName,
        iv,
        authTag,
        checksumSha256,
        encryptionAlgorithm: algorithm,
        createdAt: new Date().toISOString(),
      };

      db.createFile(fileRecord);

      // Calculate expiration
      let expiresAt: string | null = null;
      if (customExpiry) {
        expiresAt = new Date(customExpiry).toISOString();
      } else if (expiryHours && Number(expiryHours) > 0) {
        const hours = Number(expiryHours);
        expiresAt = new Date(Date.now() + hours * 3600000).toISOString();
      } else if (expiryHours === '0.166') {
        // 10 minutes preset
        expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
      }

      // Hash password if provided
      let passwordHash: string | undefined = undefined;
      const isPasswordProtected = Boolean(password && password.trim().length > 0);
      if (isPasswordProtected) {
        passwordHash = await bcrypt.hash(password.trim(), 10);
      }

      // Create initial share link
      const token = generateSecureToken(16);
      const shareLink: ShareLink = {
        id: `sh_${crypto.randomBytes(8).toString('hex')}`,
        token,
        fileId: fileRecord.id,
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

      db.createShareLink(shareLink);

      // Notification
      db.createNotification({
        id: `notif_${crypto.randomBytes(6).toString('hex')}`,
        userId: user.id,
        title: 'File Encrypted & Link Generated',
        message: `"${fileRecord.originalName}" secured with AES-256-GCM. Share link active.`,
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false,
        linkUrl: `/shares/${shareLink.id}`,
      });

      return res.status(201).json({
        file: fileRecord,
        shareLink,
        shareUrl: `/share/${shareLink.token}`,
      });
    } catch (err: any) {
      console.error('File upload & encryption error:', err);
      return res.status(500).json({ error: 'Failed to encrypt and store file' });
    }
  }
);

// Get All Files for User
router.get('/', authenticateUser, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const files = db.getFilesByUserId(user.id);
  const shareLinks = db.getShareLinksByUserId(user.id);

  // Enrich files with share link details
  const enriched = files.map(f => {
    const fileShares = shareLinks.filter(s => s.fileId === f.id);
    const activeShares = fileShares.filter(s => {
      if (s.isRevoked) return false;
      if (s.expiresAt && new Date(s.expiresAt).getTime() < Date.now()) return false;
      if (s.maxAccessCount > 0 && s.accessCount >= s.maxAccessCount) return false;
      return true;
    });

    const totalViews = fileShares.reduce((acc, curr) => acc + curr.accessCount, 0);

    return {
      ...f,
      shareCount: fileShares.length,
      activeShareCount: activeShares.length,
      totalAccessCount: totalViews,
      latestShareToken: fileShares[0]?.token,
      latestShareId: fileShares[0]?.id,
    };
  });

  return res.json(enriched);
});

// Get Single File Info
router.get('/:id', authenticateUser, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const file = db.getFileById(req.params.id);

  if (!file || file.userId !== user.id) {
    return res.status(404).json({ error: 'File not found' });
  }

  const shares = db.getShareLinksByFileId(file.id);
  return res.json({ file, shares });
});

// Download Decrypted File (Owner direct download)
router.get('/:id/download', authenticateUser, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const file = db.getFileById(req.params.id);

    if (!file || file.userId !== user.id) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(UPLOADS_DIR, file.encryptedFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Physical encrypted file missing' });
    }

    const encryptedData = fs.readFileSync(filePath);
    const decrypted = decryptBuffer(encryptedData, file.iv, file.authTag);

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', decrypted.length);
    return res.send(decrypted);
  } catch (err) {
    console.error('Owner download decryption error:', err);
    return res.status(500).json({ error: 'Decryption failed' });
  }
});

// Delete File
router.delete('/:id', authenticateUser, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const success = db.deleteFile(req.params.id, user.id);

  if (!success) {
    return res.status(404).json({ error: 'File not found or permission denied' });
  }

  db.createNotification({
    id: `notif_${crypto.randomBytes(6).toString('hex')}`,
    userId: user.id,
    title: 'File Securely Shredded',
    message: 'Encrypted file and cryptographic keys removed from disk and database.',
    type: 'warning',
    timestamp: new Date().toISOString(),
    read: false,
  });

  return res.json({ message: 'File and associated active links deleted successfully' });
});

export default router;
