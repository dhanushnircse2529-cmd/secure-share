import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Master key derivation: 32 bytes for AES-256
const MASTER_KEY_RAW = process.env.FILE_ENCRYPTION_SECRET || 'secureshare-aes-256-encryption-master-secret-key-2026';
const MASTER_KEY = crypto.createHash('sha256').update(MASTER_KEY_RAW).digest();

export interface EncryptedFileResult {
  encryptedBuffer: Buffer;
  iv: string;
  authTag: string;
  checksumSha256: string;
  algorithm: string;
}

/**
 * Encrypt a buffer with AES-256-GCM
 */
export function encryptBuffer(buffer: Buffer): EncryptedFileResult {
  const iv = crypto.randomBytes(12); // 12 bytes standard for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

  return {
    encryptedBuffer: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    checksumSha256: checksum,
    algorithm: 'AES-256-GCM',
  };
}

/**
 * Decrypt an AES-256-GCM encrypted buffer
 */
export function decryptBuffer(encryptedBuffer: Buffer, ivHex: string, authTagHex: string): Buffer {
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
  
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  return decrypted;
}

/**
 * Generate a cryptographically secure random token for sharing
 */
export function generateSecureToken(length: number = 24): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate 6-digit numeric OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Simple SVG watermark wrapper for previews
 */
export function generateSvgWatermark(text: string, subtext: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
    <style>
      .wm-main { fill: rgba(236, 72, 153, 0.28); font-family: monospace; font-size: 20px; font-weight: bold; }
      .wm-sub { fill: rgba(168, 85, 247, 0.24); font-family: monospace; font-size: 13px; }
    </style>
    <g transform="rotate(-25 200 100)">
      <text x="200" y="90" text-anchor="middle" class="wm-main">SECURESHARE PROTECTED</text>
      <text x="200" y="115" text-anchor="middle" class="wm-sub">${escapeXml(text)}</text>
      <text x="200" y="135" text-anchor="middle" class="wm-sub">${escapeXml(subtext)}</text>
    </g>
  </svg>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
