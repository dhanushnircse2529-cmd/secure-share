export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTimeRemaining(expiresAt?: string | null): { text: string; isExpired: boolean; isUrgent: boolean } {
  if (!expiresAt) return { text: 'No Expiration', isExpired: false, isUrgent: false };
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { text: 'Expired', isExpired: true, isUrgent: false };

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return { text: `${days}d ${hours % 24}h remaining`, isExpired: false, isUrgent: days < 1 };
  }
  if (hours > 0) {
    return { text: `${hours}h ${minutes % 60}m remaining`, isExpired: false, isUrgent: true };
  }
  const seconds = Math.floor((diff % 60000) / 1000);
  return { text: `${minutes}m ${seconds}s remaining`, isExpired: false, isUrgent: true };
}

export function getPasswordStrength(password: string): {
  score: number;
  label: 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
  color: string;
} {
  if (!password) return { score: 0, label: 'Very Weak', color: 'bg-zinc-600' };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (score <= 2) return { score: 2, label: 'Weak', color: 'bg-orange-500' };
  if (score === 3) return { score: 3, label: 'Medium', color: 'bg-yellow-500' };
  if (score === 4) return { score: 4, label: 'Strong', color: 'bg-violet-500' };
  return { score: 5, label: 'Very Strong', color: 'bg-pink-500' };
}

export function getFileIconColor(mimeType: string = ''): string {
  if (mimeType.startsWith('image/')) return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
  if (mimeType.startsWith('video/')) return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
  if (mimeType.startsWith('audio/')) return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
  if (mimeType.includes('pdf')) return 'text-red-400 bg-red-500/10 border-red-500/20';
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('archive')) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
}
