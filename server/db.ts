import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileRecord {
  id: string;
  userId: string;
  originalName: string;
  mimeType: string;
  size: number;
  encryptedFileName: string;
  iv: string;
  authTag: string;
  checksumSha256: string;
  encryptionAlgorithm: string;
  createdAt: string;
}

export interface ShareLink {
  id: string;
  token: string;
  fileId: string;
  userId: string;
  recipientEmail?: string;
  isPasswordProtected: boolean;
  passwordHash?: string;
  otpRequired: boolean;
  expiresAt: string | null; // ISO string or null for never
  maxAccessCount: number; // e.g. 1, 5, 10 or 0 for unlimited
  accessCount: number;
  downloadAllowed: boolean;
  watermarkEnabled: boolean;
  autoRevokeOnSuspicious: boolean;
  isRevoked: boolean;
  revokedAt?: string | null;
  autoRevokedReason?: string | null;
  createdAt: string;
}

export interface AccessLog {
  id: string;
  shareLinkId: string;
  fileId: string;
  ownerUserId: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  browser: string;
  action: 'view' | 'download' | 'password_attempt' | 'otp_attempt' | 'failed_access' | 'expired_blocked' | 'limit_blocked';
  status: 'success' | 'failed' | 'blocked';
  recipientEmail?: string;
  isSuspicious: boolean;
  suspiciousReason?: string;
}

export interface SecurityAlert {
  id: string;
  userId: string;
  shareLinkId?: string;
  fileId?: string;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  actionTaken?: string;
}

export interface OTPRecord {
  id: string;
  shareLinkId: string;
  recipientEmail: string;
  code: string;
  expiresAt: string;
  verified: boolean;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  timestamp: string;
  read: boolean;
  linkUrl?: string;
}

// Data Directory
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'encrypted_files');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface DatabaseSchema {
  users: User[];
  files: FileRecord[];
  shareLinks: ShareLink[];
  accessLogs: AccessLog[];
  securityAlerts: SecurityAlert[];
  otps: OTPRecord[];
  notifications: NotificationRecord[];
}

const DB_FILE = path.join(DATA_DIR, 'database.json');

class DatabaseStore {
  private data: DatabaseSchema = {
    users: [],
    files: [],
    shareLinks: [],
    accessLogs: [],
    securityAlerts: [],
    otps: [],
    notifications: [],
  };

  constructor() {
    this.load();
    this.initDemoDataIfEmpty();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Error loading database, resetting to default structure', err);
      this.save();
    }
  }

  private save() {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  private async initDemoDataIfEmpty() {
    if (this.data.users.length === 0) {
      const demoPassword = await bcrypt.hash('SecureShare2026!', 10);
      const demoUser: User = {
        id: 'usr_demo_admin',
        name: 'Cyber Sentinel',
        email: 'dhanushni8985@gmail.com',
        passwordHash: demoPassword,
        twoFactorEnabled: true,
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.users.push(demoUser);

      // Add a dummy encrypted file for initial richness
      const fileId = 'file_financial_audit_q3';
      const encryptedFileName = `${fileId}.enc`;
      const dummyContent = Buffer.from(
        'CONFIDENTIAL FINANCIAL AUDIT & SECURITY COMPLIANCE REPORT 2026\n\n' +
        'Classification: TOP SECRET // AES-256 PROTECTED\n' +
        'Auditor: Global Cyber Defense Unit\n\n' +
        'Key Findings:\n' +
        '1. Zero unencrypted file transfers detected across all endpoints.\n' +
        '2. Expiry link automation verified: 100% destruction of expired tokens.\n' +
        '3. Brute force defense system triggered 3 times, successfully blocking unauthorized probes.\n\n' +
        'Authorized Viewers Only. Dynamic Watermarking Active.'
      );

      // Encrypt dummy content
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', crypto.createHash('sha256').update(process.env.FILE_ENCRYPTION_SECRET || 'secureshare-aes-256-encryption-master-secret-key-2026').digest(), iv);
      const encryptedBuffer = Buffer.concat([cipher.update(dummyContent), cipher.final()]);
      const authTag = cipher.getAuthTag();

      fs.writeFileSync(path.join(UPLOADS_DIR, encryptedFileName), encryptedBuffer);

      const demoFile: FileRecord = {
        id: fileId,
        userId: demoUser.id,
        originalName: 'Q3_Financial_Audit_Report_2026.pdf.txt',
        mimeType: 'text/plain',
        size: dummyContent.length,
        encryptedFileName,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        checksumSha256: crypto.createHash('sha256').update(dummyContent).digest('hex'),
        encryptionAlgorithm: 'AES-256-GCM',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      };
      this.data.files.push(demoFile);

      // Demo active share link
      const shareToken = 'demo-sec-88f921';
      const sharePass = await bcrypt.hash('Auditor@2026', 10);
      const demoShare: ShareLink = {
        id: 'sh_demo_01',
        token: shareToken,
        fileId: demoFile.id,
        userId: demoUser.id,
        recipientEmail: 'client-executive@enterprise.corp',
        isPasswordProtected: true,
        passwordHash: sharePass,
        otpRequired: false,
        expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
        maxAccessCount: 5,
        accessCount: 2,
        downloadAllowed: true,
        watermarkEnabled: true,
        autoRevokeOnSuspicious: true,
        isRevoked: false,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      };
      this.data.shareLinks.push(demoShare);

      // Demo Access Logs
      this.data.accessLogs.push(
        {
          id: 'log_01',
          shareLinkId: demoShare.id,
          fileId: demoFile.id,
          ownerUserId: demoUser.id,
          timestamp: new Date(Date.now() - 36 * 3600000).toISOString(),
          ipAddress: '198.51.100.44',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          deviceType: 'Desktop (macOS)',
          browser: 'Chrome 120',
          action: 'view',
          status: 'success',
          recipientEmail: 'client-executive@enterprise.corp',
          isSuspicious: false,
        },
        {
          id: 'log_02',
          shareLinkId: demoShare.id,
          fileId: demoFile.id,
          ownerUserId: demoUser.id,
          timestamp: new Date(Date.now() - 34 * 3600000).toISOString(),
          ipAddress: '198.51.100.44',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          deviceType: 'Desktop (macOS)',
          browser: 'Chrome 120',
          action: 'download',
          status: 'success',
          recipientEmail: 'client-executive@enterprise.corp',
          isSuspicious: false,
        },
        {
          id: 'log_03',
          shareLinkId: demoShare.id,
          fileId: demoFile.id,
          ownerUserId: demoUser.id,
          timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
          ipAddress: '45.33.32.156',
          userAgent: 'Python-urllib/3.8 automated-probe',
          deviceType: 'Bot / Script',
          browser: 'Unknown',
          action: 'password_attempt',
          status: 'failed',
          recipientEmail: 'unknown_probe@scanner.net',
          isSuspicious: true,
          suspiciousReason: 'Brute-force pattern: Automated user-agent & rapid failed password guesses',
        }
      );

      // Demo Security Alerts
      this.data.securityAlerts.push(
        {
          id: 'alt_01',
          userId: demoUser.id,
          shareLinkId: demoShare.id,
          fileId: demoFile.id,
          level: 'MEDIUM',
          title: 'Failed Password Spike Detected',
          description: '3 consecutive incorrect password attempts detected from IP 45.33.32.156 targeting "Q3_Financial_Audit_Report_2026.pdf.txt".',
          timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
          resolved: false,
          actionTaken: 'IP rate limited for 15 minutes',
        },
        {
          id: 'alt_02',
          userId: demoUser.id,
          shareLinkId: demoShare.id,
          fileId: demoFile.id,
          level: 'LOW',
          title: 'Authorized File Access',
          description: 'Recipient client-executive@enterprise.corp successfully viewed decrypted document.',
          timestamp: new Date(Date.now() - 36 * 3600000).toISOString(),
          resolved: true,
        }
      );

      // Demo notifications
      this.data.notifications.push(
        {
          id: 'notif_01',
          userId: demoUser.id,
          title: 'File Accessed',
          message: 'client-executive@enterprise.corp viewed your file "Q3_Financial_Audit_Report_2026.pdf.txt"',
          type: 'info',
          timestamp: new Date(Date.now() - 36 * 3600000).toISOString(),
          read: false,
        },
        {
          id: 'notif_02',
          userId: demoUser.id,
          title: 'Security Warning',
          message: 'Suspicious password attempt blocked on active share link.',
          type: 'warning',
          timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
          read: false,
        }
      );

      this.save();
    }
  }

  // Users
  getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  createUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    this.data.users[idx] = { ...this.data.users[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.data.users[idx];
  }

  // Files
  getFilesByUserId(userId: string): FileRecord[] {
    return this.data.files.filter(f => f.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getFileById(id: string): FileRecord | undefined {
    return this.data.files.find(f => f.id === id);
  }

  createFile(file: FileRecord): FileRecord {
    this.data.files.push(file);
    this.save();
    return file;
  }

  deleteFile(id: string, userId: string): boolean {
    const file = this.data.files.find(f => f.id === id && f.userId === userId);
    if (!file) return false;

    // Delete encrypted file from disk
    const filePath = path.join(UPLOADS_DIR, file.encryptedFileName);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Error deleting physical file', e);
      }
    }

    this.data.files = this.data.files.filter(f => f.id !== id);
    // Mark associated share links as revoked
    this.data.shareLinks.forEach(sh => {
      if (sh.fileId === id) {
        sh.isRevoked = true;
        sh.revokedAt = new Date().toISOString();
        sh.autoRevokedReason = 'Source file deleted by owner';
      }
    });

    this.save();
    return true;
  }

  // Share Links
  getShareLinksByUserId(userId: string): ShareLink[] {
    return this.data.shareLinks.filter(s => s.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getShareLinksByFileId(fileId: string): ShareLink[] {
    return this.data.shareLinks.filter(s => s.fileId === fileId);
  }

  getShareLinkByToken(token: string): ShareLink | undefined {
    return this.data.shareLinks.find(s => s.token === token);
  }

  getShareLinkById(id: string): ShareLink | undefined {
    return this.data.shareLinks.find(s => s.id === id);
  }

  createShareLink(link: ShareLink): ShareLink {
    this.data.shareLinks.push(link);
    this.save();
    return link;
  }

  updateShareLink(id: string, updates: Partial<ShareLink>): ShareLink | undefined {
    const idx = this.data.shareLinks.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    this.data.shareLinks[idx] = { ...this.data.shareLinks[idx], ...updates };
    this.save();
    return this.data.shareLinks[idx];
  }

  deleteShareLink(id: string, userId: string): boolean {
    const idx = this.data.shareLinks.findIndex(s => s.id === id && s.userId === userId);
    if (idx === -1) return false;
    this.data.shareLinks.splice(idx, 1);
    this.save();
    return true;
  }

  // Access Logs
  createAccessLog(log: AccessLog): AccessLog {
    this.data.accessLogs.push(log);
    this.save();
    return log;
  }

  getAccessLogsByUserId(userId: string): AccessLog[] {
    return this.data.accessLogs.filter(l => l.ownerUserId === userId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  getAccessLogsByShareId(shareLinkId: string): AccessLog[] {
    return this.data.accessLogs.filter(l => l.shareLinkId === shareLinkId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Security Alerts
  createSecurityAlert(alert: SecurityAlert): SecurityAlert {
    this.data.securityAlerts.unshift(alert);
    this.save();
    return alert;
  }

  getSecurityAlertsByUserId(userId: string): SecurityAlert[] {
    return this.data.securityAlerts.filter(a => a.userId === userId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  resolveSecurityAlert(id: string, userId: string): boolean {
    const alert = this.data.securityAlerts.find(a => a.id === id && a.userId === userId);
    if (!alert) return false;
    alert.resolved = true;
    this.save();
    return true;
  }

  // OTPs
  createOTP(otp: OTPRecord): OTPRecord {
    // Invalidate old OTPs for same link & email
    this.data.otps = this.data.otps.filter(o => !(o.shareLinkId === otp.shareLinkId && o.recipientEmail === otp.recipientEmail));
    this.data.otps.push(otp);
    this.save();
    return otp;
  }

  verifyOTP(shareLinkId: string, email: string, code: string): boolean {
    const record = this.data.otps.find(o => o.shareLinkId === shareLinkId && o.recipientEmail.toLowerCase() === email.toLowerCase() && !o.verified);
    if (!record) return false;
    if (new Date(record.expiresAt).getTime() < Date.now()) return false;
    if (record.code !== code.trim()) return false;
    record.verified = true;
    this.save();
    return true;
  }

  // Notifications
  createNotification(notif: NotificationRecord): NotificationRecord {
    this.data.notifications.unshift(notif);
    this.save();
    return notif;
  }

  getNotificationsByUserId(userId: string): NotificationRecord[] {
    return this.data.notifications.filter(n => n.userId === userId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  markNotificationRead(id: string, userId: string): boolean {
    const notif = this.data.notifications.find(n => n.id === id && n.userId === userId);
    if (!notif) return false;
    notif.read = true;
    this.save();
    return true;
  }

  markAllNotificationsRead(userId: string): boolean {
    this.data.notifications.forEach(n => {
      if (n.userId === userId) n.read = true;
    });
    this.save();
    return true;
  }
}

export const db = new DatabaseStore();
export { UPLOADS_DIR };
