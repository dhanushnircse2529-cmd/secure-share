export interface User {
  id: string;
  name: string;
  email: string;
  twoFactorEnabled: boolean;
  createdAt: string;
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
  shareCount?: number;
  activeShareCount?: number;
  totalAccessCount?: number;
  latestShareToken?: string;
  latestShareId?: string;
}

export interface ShareLink {
  id: string;
  token: string;
  fileId: string;
  userId: string;
  recipientEmail?: string;
  isPasswordProtected: boolean;
  otpRequired: boolean;
  expiresAt: string | null;
  maxAccessCount: number;
  accessCount: number;
  downloadAllowed: boolean;
  watermarkEnabled: boolean;
  autoRevokeOnSuspicious: boolean;
  isRevoked: boolean;
  revokedAt?: string | null;
  autoRevokedReason?: string | null;
  createdAt: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  status?: 'active' | 'revoked' | 'expired' | 'limit_reached';
  isExpired?: boolean;
  isLimitReached?: boolean;
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
  fileName?: string;
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

export interface SecurityStats {
  securityScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  totalFiles: number;
  activeLinks: number;
  expiredLinks: number;
  revokedLinks: number;
  passwordProtectedLinks: number;
  expiringSoonCount: number;
  totalViews: number;
  totalDownloads: number;
  suspiciousAttempts: number;
  failedPasswordAttempts: number;
  unresolvedAlertsCount: number;
  encryptionAlgorithm: string;
  twoFactorActive: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  timestamp: string;
  read: boolean;
  linkUrl?: string;
}

export interface RecipientShareMeta {
  token: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksumSha256: string;
  encryptionAlgorithm: string;
  isPasswordProtected: boolean;
  otpRequired: boolean;
  recipientEmail?: string | null;
  expiresAt: string | null;
  maxAccessCount: number;
  accessCount: number;
  downloadAllowed: boolean;
  watermarkEnabled: boolean;
  requiresAuth: boolean;
}

export type RecipientLinkMeta = RecipientShareMeta;

export interface DecryptedFilePayload {
  token: string;
  file: {
    originalName: string;
    mimeType: string;
    size: number;
    checksumSha256?: string;
  };
  accessToken?: string;
  downloadAllowed: boolean;
  watermarkEnabled: boolean;
  watermarkText?: string;
  remainingAccesses?: number | null;
}

export type AppView = 
  | 'landing' 
  | 'login' 
  | 'register' 
  | 'dashboard' 
  | 'upload' 
  | 'files' 
  | 'shares' 
  | 'share_detail'
  | 'logs' 
  | 'security' 
  | 'profile'
  | 'recipient';
