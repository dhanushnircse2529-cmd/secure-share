import { Router, Response } from 'express';
import { db } from '../db';
import { authenticateUser, AuthRequest } from '../auth';

const router = Router();

// 1. Get Access Logs with optional filter queries
router.get('/logs', authenticateUser, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { fileId, shareLinkId, status, suspiciousOnly } = req.query;

  let logs = db.getAccessLogsByUserId(user.id);
  const files = db.getFilesByUserId(user.id);
  const fileMap = new Map(files.map(f => [f.id, f.originalName]));

  if (fileId) {
    logs = logs.filter(l => l.fileId === fileId);
  }
  if (shareLinkId) {
    logs = logs.filter(l => l.shareLinkId === shareLinkId);
  }
  if (status) {
    logs = logs.filter(l => l.status === status);
  }
  if (suspiciousOnly === 'true') {
    logs = logs.filter(l => l.isSuspicious);
  }

  const enriched = logs.map(l => ({
    ...l,
    fileName: fileMap.get(l.fileId) || 'Unknown / Deleted File',
  }));

  return res.json(enriched);
});

// 2. Security Dashboard Stats & Risk Score
router.get('/security/stats', authenticateUser, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const files = db.getFilesByUserId(user.id);
  const shareLinks = db.getShareLinksByUserId(user.id);
  const accessLogs = db.getAccessLogsByUserId(user.id);
  const alerts = db.getSecurityAlertsByUserId(user.id);

  const now = Date.now();
  let activeLinksCount = 0;
  let expiredLinksCount = 0;
  let revokedLinksCount = 0;
  let passwordProtectedCount = 0;
  let expiringSoonCount = 0; // within 24h

  shareLinks.forEach(link => {
    const isExpired = link.expiresAt ? new Date(link.expiresAt).getTime() < now : false;
    const isLimitReached = link.maxAccessCount > 0 && link.accessCount >= link.maxAccessCount;

    if (link.isRevoked) {
      revokedLinksCount++;
    } else if (isExpired || isLimitReached) {
      expiredLinksCount++;
    } else {
      activeLinksCount++;
      if (link.isPasswordProtected) passwordProtectedCount++;
      if (link.expiresAt) {
        const diffHours = (new Date(link.expiresAt).getTime() - now) / 3600000;
        if (diffHours > 0 && diffHours <= 24) {
          expiringSoonCount++;
        }
      }
    }
  });

  const totalViews = accessLogs.filter(l => l.action === 'view' && l.status === 'success').length;
  const totalDownloads = accessLogs.filter(l => l.action === 'download' && l.status === 'success').length;
  const suspiciousAttempts = accessLogs.filter(l => l.isSuspicious).length;
  const failedPasswordAttempts = accessLogs.filter(l => l.action === 'password_attempt' && l.status === 'failed').length;

  const unresolvedHighAlerts = alerts.filter(a => !a.resolved && a.level === 'HIGH').length;
  const unresolvedMediumAlerts = alerts.filter(a => !a.resolved && a.level === 'MEDIUM').length;

  // Calculate Security Posture Score (0 - 100)
  let score = 100;
  if (!user.twoFactorEnabled) score -= 15;
  if (unresolvedHighAlerts > 0) score -= Math.min(30, unresolvedHighAlerts * 15);
  if (unresolvedMediumAlerts > 0) score -= Math.min(15, unresolvedMediumAlerts * 5);
  if (suspiciousAttempts > 0) score -= Math.min(15, suspiciousAttempts * 3);
  
  // Penalize un-expiring links if any
  const neverExpiringLinks = shareLinks.filter(s => !s.isRevoked && !s.expiresAt);
  if (neverExpiringLinks.length > 0) {
    score -= Math.min(10, neverExpiringLinks.length * 2);
  }

  score = Math.max(20, Math.min(100, score));

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (score < 60 || unresolvedHighAlerts > 0) riskLevel = 'HIGH';
  else if (score < 85 || unresolvedMediumAlerts > 0 || suspiciousAttempts > 0) riskLevel = 'MEDIUM';

  return res.json({
    securityScore: score,
    riskLevel,
    totalFiles: files.length,
    activeLinks: activeLinksCount,
    expiredLinks: expiredLinksCount,
    revokedLinks: revokedLinksCount,
    passwordProtectedLinks: passwordProtectedCount,
    expiringSoonCount,
    totalViews,
    totalDownloads,
    suspiciousAttempts,
    failedPasswordAttempts,
    unresolvedAlertsCount: unresolvedHighAlerts + unresolvedMediumAlerts,
    encryptionAlgorithm: 'AES-256-GCM',
    twoFactorActive: user.twoFactorEnabled,
  });
});

// 3. Security Alerts
router.get('/security/alerts', authenticateUser, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const alerts = db.getSecurityAlertsByUserId(user.id);
  return res.json(alerts);
});

// Resolve Alert
router.post('/security/alerts/:id/resolve', authenticateUser, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const success = db.resolveSecurityAlert(req.params.id, user.id);
  if (!success) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  return res.json({ message: 'Security alert marked as resolved' });
});

// 4. Notifications
router.get('/notifications', authenticateUser, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const notifs = db.getNotificationsByUserId(user.id);
  return res.json(notifs);
});

router.post('/notifications/:id/read', authenticateUser, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  db.markNotificationRead(req.params.id, user.id);
  return res.json({ success: true });
});

router.post('/notifications/read-all', authenticateUser, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  db.markAllNotificationsRead(user.id);
  return res.json({ success: true });
});

export default router;
