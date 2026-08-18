import { User, FileRecord, ShareLink, AccessLog, SecurityAlert, SecurityStats, NotificationItem, RecipientShareMeta } from '../types';

const TOKEN_KEY = 'secureshare_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const error: any = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

export const api = {
  // Auth
  async register(data: { name: string; email: string; password: string }) {
    return request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data: { email: string; password: string }) {
    return request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMe() {
    return request<User>('/api/auth/me');
  },

  async changePassword(currentPasswordOrObj: string | { currentPassword: string; newPassword: string }, maybeNewPassword?: string) {
    const data = typeof currentPasswordOrObj === 'string'
      ? { currentPassword: currentPasswordOrObj, newPassword: maybeNewPassword || '' }
      : currentPasswordOrObj;
    return request<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProfile(updates: { name?: string; twoFactorEnabled?: boolean }) {
    if (updates.twoFactorEnabled !== undefined) {
      return request<{ twoFactorEnabled: boolean; message: string }>('/api/auth/toggle-2fa', {
        method: 'POST',
      });
    }
    return { success: true };
  },

  async toggle2FA() {
    return request<{ twoFactorEnabled: boolean; message: string }>('/api/auth/toggle-2fa', {
      method: 'POST',
    });
  },

  // Files
  async uploadFile(formData: FormData) {
    const token = getStoredToken();
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'File upload failed');
    }
    return data as { file: FileRecord; shareLink: ShareLink; shareUrl: string };
  },

  async getFiles() {
    return request<FileRecord[]>('/api/files');
  },

  async getFile(id: string) {
    return request<{ file: FileRecord; shares: ShareLink[] }>(`/api/files/${id}`);
  },

  async deleteFile(id: string) {
    return request<{ message: string }>(`/api/files/${id}`, {
      method: 'DELETE',
    });
  },

  async downloadOwnerFile(fileId: string, fileName: string) {
    const token = getStoredToken();
    const response = await fetch(`/api/files/${fileId}/download`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download decrypted file');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Shares
  async createShareLink(data: {
    fileId: string;
    recipientEmail?: string;
    password?: string;
    expiryHours?: string | number;
    customExpiry?: string;
    maxAccessCount?: number;
    downloadAllowed?: boolean;
    watermarkEnabled?: boolean;
    autoRevokeOnSuspicious?: boolean;
    requireOtp?: boolean;
  }) {
    return request<{ shareLink: ShareLink; file: FileRecord; shareUrl: string }>('/api/shares/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getShareLinks() {
    return request<ShareLink[]>('/api/shares');
  },

  async getShareLink(id: string) {
    return request<{ shareLink: ShareLink; file: FileRecord; logs: AccessLog[] }>(`/api/shares/${id}`);
  },

  async revokeShareLink(id: string) {
    return request<{ message: string; shareLink: ShareLink }>(`/api/shares/${id}/revoke`, {
      method: 'POST',
    });
  },

  async updateShareLink(id: string, updates: any) {
    return request<{ message: string; shareLink: ShareLink }>(`/api/shares/${id}/update`, {
      method: 'POST',
      body: JSON.stringify(updates),
    });
  },

  async deleteShareLink(id: string) {
    return request<{ message: string }>(`/api/shares/${id}`, {
      method: 'DELETE',
    });
  },

  // Access Logs & Security
  async getAccessLogs(filters: { fileId?: string; shareLinkId?: string; status?: string; suspiciousOnly?: boolean } = {}) {
    const params = new URLSearchParams();
    if (filters.fileId) params.append('fileId', filters.fileId);
    if (filters.shareLinkId) params.append('shareLinkId', filters.shareLinkId);
    if (filters.status) params.append('status', filters.status);
    if (filters.suspiciousOnly) params.append('suspiciousOnly', 'true');

    return request<AccessLog[]>(`/api/logs?${params.toString()}`);
  },

  async getSecurityStats() {
    return request<SecurityStats>('/api/security/stats');
  },

  async getSecurityAlerts() {
    return request<SecurityAlert[]>('/api/security/alerts');
  },

  async resolveSecurityAlert(id: string) {
    return request<{ message: string }>(`/api/security/alerts/${id}/resolve`, {
      method: 'POST',
    });
  },

  async getNotifications() {
    return request<NotificationItem[]>('/api/notifications');
  },

  async markNotificationRead(id: string) {
    return request<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: 'POST',
    });
  },

  async markAllNotificationsRead() {
    return request<{ success: boolean }>('/api/notifications/read-all', {
      method: 'POST',
    });
  },

  // Recipient Public Portal
  async getRecipientShareMeta(token: string) {
    return request<RecipientShareMeta>(`/api/public/share/${token}`);
  },

  async getRecipientMeta(token: string) {
    return this.getRecipientShareMeta(token);
  },

  async verifyRecipientPassword(token: string, data: { password?: string; recipientEmail?: string }) {
    return request<{ success: boolean; accessToken?: string; requiresOtp?: boolean; message?: string }>(
      `/api/public/share/${token}/verify-password`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async requestRecipientOtp(token: string, email?: string) {
    return request<{ success: boolean; message: string; previewOtpCode?: string; expiresAt: string }>(
      `/api/public/share/${token}/request-otp`,
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
  },

  async verifyRecipientOtp(token: string, data: { email?: string; code: string }) {
    return request<{ success: boolean; accessToken: string; message: string }>(
      `/api/public/share/${token}/verify-otp`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async verifyRecipientAccess(token: string, options: { password?: string; email?: string; otpCode?: string }) {
    // If otpCode is supplied, verify OTP
    if (options.otpCode) {
      const otpRes = await this.verifyRecipientOtp(token, { email: options.email, code: options.otpCode });
      const meta = await this.getRecipientShareMeta(token);
      return {
        token,
        file: {
          originalName: meta.fileName,
          mimeType: meta.mimeType,
          size: meta.fileSize,
          checksumSha256: meta.checksumSha256,
        },
        accessToken: otpRes.accessToken,
        downloadAllowed: meta.downloadAllowed,
        watermarkEnabled: meta.watermarkEnabled,
        watermarkText: options.email ? `${options.email} • Protected View` : undefined,
        remainingAccesses: meta.maxAccessCount > 0 ? Math.max(0, meta.maxAccessCount - meta.accessCount) : null,
      };
    }

    // Otherwise verify password / no-password access
    const pwdRes = await this.verifyRecipientPassword(token, {
      password: options.password,
      recipientEmail: options.email,
    });

    if (pwdRes.requiresOtp) {
      // Auto-trigger OTP generation for recipient convenience
      const otpReq = await this.requestRecipientOtp(token, options.email).catch(() => null);
      return {
        requiresOtp: true,
        demoOtpCode: otpReq?.previewOtpCode,
      } as any;
    }

    const meta = await this.getRecipientShareMeta(token);
    return {
      token,
      file: {
        originalName: meta.fileName,
        mimeType: meta.mimeType,
        size: meta.fileSize,
        checksumSha256: meta.checksumSha256,
      },
      accessToken: pwdRes.accessToken,
      downloadAllowed: meta.downloadAllowed,
      watermarkEnabled: meta.watermarkEnabled,
      watermarkText: options.email ? `${options.email} • Protected View` : undefined,
      remainingAccesses: meta.maxAccessCount > 0 ? Math.max(0, meta.maxAccessCount - meta.accessCount) : null,
    };
  },

  async fetchDecryptedBlob(token: string, authToken?: string, email?: string): Promise<Blob> {
    const params = new URLSearchParams();
    if (authToken) params.append('auth_token', authToken);
    if (email) params.append('recipient_email', email);

    const response = await fetch(`/api/public/share/${token}/view?${params.toString()}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Decryption failed' }));
      throw new Error(err.error || 'Failed to decrypt file stream');
    }

    return response.blob();
  },

  async downloadRecipientFile(token: string, fileName: string, authToken?: string, email?: string) {
    const params = new URLSearchParams();
    if (authToken) params.append('auth_token', authToken);
    if (email) params.append('recipient_email', email);

    const response = await fetch(`/api/public/share/${token}/download?${params.toString()}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(err.error || 'Failed to download file');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
