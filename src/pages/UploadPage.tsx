import React, { useState, useRef } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { AppView, ShareLink, FileRecord } from '../types';
import { api } from '../lib/api';
import { formatBytes, getPasswordStrength } from '../lib/utils';
import { QRCodeModal } from '../components/QRCodeModal';
import {
  Upload,
  File,
  Lock,
  Clock,
  Eye,
  Sliders,
  Shield,
  Key,
  Mail,
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  Sparkles,
  Layers,
  Fingerprint,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface UploadPageProps {
  onNavigate: (view: AppView) => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ onNavigate }) => {
  const { showToast } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [expiryOption, setExpiryOption] = useState<'0.166' | '1' | '6' | '24' | '168' | 'custom' | 'none'>('24');
  const [customExpiryDate, setCustomExpiryDate] = useState('');
  const [maxAccessLimit, setMaxAccessLimit] = useState<string>('5');
  const [downloadAllowed, setDownloadAllowed] = useState(true);
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [requireOtp, setRequireOtp] = useState(false);
  const [autoRevokeOnSuspicious, setAutoRevokeOnSuspicious] = useState(true);

  // Upload progress & state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [encryptionStage, setEncryptionStage] = useState<'idle' | 'reading' | 'encrypting' | 'storing' | 'complete'>('idle');
  const [createdShare, setCreatedShare] = useState<{ file: FileRecord; shareLink: ShareLink; shareUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast({ title: 'File Missing', message: 'Please select a file to encrypt', type: 'alert' });
      return;
    }

    if (enablePassword && password.length < 6) {
      showToast({ title: 'Weak Password', message: 'Password protection requires at least 6 characters', type: 'alert' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setEncryptionStage('reading');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (recipientEmail) formData.append('recipientEmail', recipientEmail);
      if (enablePassword && password) formData.append('password', password);

      if (expiryOption === 'custom' && customExpiryDate) {
        formData.append('customExpiry', customExpiryDate);
      } else if (expiryOption !== 'none' && expiryOption !== 'custom') {
        formData.append('expiryHours', expiryOption);
      }

      formData.append('maxAccessCount', maxAccessLimit);
      formData.append('downloadAllowed', String(downloadAllowed));
      formData.append('watermarkEnabled', String(watermarkEnabled));
      formData.append('requireOtp', String(requireOtp));
      formData.append('autoRevokeOnSuspicious', String(autoRevokeOnSuspicious));

      // Simulate step progress for visual fidelity
      setTimeout(() => {
        setUploadProgress(45);
        setEncryptionStage('encrypting');
      }, 400);

      setTimeout(() => {
        setUploadProgress(80);
        setEncryptionStage('storing');
      }, 900);

      const result = await api.uploadFile(formData);

      setUploadProgress(100);
      setEncryptionStage('complete');
      setCreatedShare(result);

      showToast({
        title: 'AES-256 Encryption Complete',
        message: `File securely sealed with token ${result.shareLink.token.slice(0, 8)}...`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Upload Error',
        message: err.message || 'Failed to encrypt file',
        type: 'alert',
      });
      setIsUploading(false);
      setEncryptionStage('idle');
    }
  };

  const getFullShareUrl = (token: string) => {
    return `${window.location.origin}/share/${token}`;
  };

  const handleCopyLink = () => {
    if (!createdShare) return;
    navigator.clipboard.writeText(getFullShareUrl(createdShare.shareLink.token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-semibold">
          <Shield className="w-3.5 h-3.5 text-pink-400" />
          <span>Client-to-Vault AES-256 Storage Pipeline</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Secure File Encryption & Expiry Share
        </h1>
        <p className="text-xs text-zinc-400 max-w-lg mx-auto">
          Files are encrypted before writing to disk. Configure access controls, passwords, watermarks, and auto-destruct limits below.
        </p>
      </div>

      {createdShare ? (
        /* Result Screen */
        <div className="p-8 glass-panel rounded-3xl border border-violet-500/30 shadow-2xl space-y-6 text-center glow-pink animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 mx-auto flex items-center justify-center text-white shadow-xl shadow-emerald-500/25">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-white">File Encrypted & Link Active!</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Encrypted with AES-256-GCM cipher and indexed with zero-knowledge token.
            </p>
          </div>

          {/* Details Card */}
          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-violet-500/20 text-left max-w-md mx-auto space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-violet-500/10">
              <span className="text-zinc-400">File Name:</span>
              <span className="font-semibold text-white truncate max-w-[200px]">{createdShare.file.originalName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-violet-500/10">
              <span className="text-zinc-400">Size:</span>
              <span className="font-mono text-zinc-300">{formatBytes(createdShare.file.size)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-violet-500/10">
              <span className="text-zinc-400">SHA-256 Integrity:</span>
              <span className="font-mono text-zinc-400 text-[10px] truncate max-w-[180px]">{createdShare.file.checksumSha256}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-violet-500/10">
              <span className="text-zinc-400">Protection:</span>
              <span className="text-pink-400 font-semibold">
                {createdShare.shareLink.isPasswordProtected ? 'Password Gate Active' : 'Public Token'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-400">Permission:</span>
              <span className="text-emerald-400 font-semibold">
                {createdShare.shareLink.downloadAllowed ? 'Decrypted Download Allowed' : 'View Only (Protected)'}
              </span>
            </div>
          </div>

          {/* Share Link Copy Bar */}
          <div className="max-w-xl mx-auto space-y-3">
            <div className="flex items-center gap-2 p-2 rounded-2xl bg-zinc-950/80 border border-violet-500/40">
              <input
                type="text"
                readOnly
                value={getFullShareUrl(createdShare.shareLink.token)}
                className="bg-transparent text-xs text-zinc-200 px-3 w-full outline-none font-mono"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-lg shadow-pink-600/30 transition-all"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setShowQR(true)}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-violet-500/30 text-xs font-semibold text-zinc-200 flex items-center gap-2 transition-all"
              >
                <QrCode className="w-4 h-4 text-pink-400" />
                <span>Show QR Code</span>
              </button>

              <a
                href={getFullShareUrl(createdShare.shareLink.token)}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-xs font-semibold text-violet-200 flex items-center gap-2 transition-all"
              >
                <Eye className="w-4 h-4 text-violet-400" />
                <span>Open Recipient Portal</span>
              </a>

              <button
                onClick={() => {
                  setCreatedShare(null);
                  setSelectedFile(null);
                  setIsUploading(false);
                  setUploadProgress(0);
                  setEncryptionStage('idle');
                }}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-all"
              >
                Upload Another File
              </button>
            </div>
          </div>

          <QRCodeModal
            isOpen={showQR}
            onClose={() => setShowQR(false)}
            url={getFullShareUrl(createdShare.shareLink.token)}
            fileName={createdShare.file.originalName}
            isPasswordProtected={createdShare.shareLink.isPasswordProtected}
            expiresAt={createdShare.shareLink.expiresAt}
          />
        </div>
      ) : (
        /* Upload Form */
        <form onSubmit={handleUploadSubmit} className="space-y-6">
          {/* File Dropzone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-8 rounded-3xl border-2 border-dashed transition-all cursor-pointer text-center glass-panel-subtle ${
              selectedFile
                ? 'border-pink-500/60 bg-pink-950/20 shadow-xl shadow-pink-950/20'
                : 'border-violet-500/40 hover:border-pink-500/50 hover:bg-violet-950/20'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-500 flex items-center justify-center mx-auto text-white shadow-lg shadow-pink-500/30">
                  <File className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white truncate max-w-md mx-auto">
                    {selectedFile.name}
                  </h4>
                  <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 font-mono mt-1">
                    <span>{formatBytes(selectedFile.size)}</span>
                    <span>•</span>
                    <span>{selectedFile.type || 'Binary file'}</span>
                  </div>
                </div>
                <span className="inline-block text-[11px] text-pink-400 underline hover:text-pink-300">
                  Click to replace file
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    Drag and drop your file here, or <span className="text-pink-400 underline">browse</span>
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Supports documents, images, archives, videos, audio up to 50MB.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Security Configuration Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Card: Expiry & Access Limits */}
            <div className="p-6 glass-panel rounded-3xl border border-violet-500/20 space-y-4">
              <div className="flex items-center gap-2 border-b border-violet-500/20 pb-3">
                <Clock className="w-4 h-4 text-pink-400" />
                <h3 className="text-sm font-bold text-white">Link Expiry & Limits</h3>
              </div>

              {/* Expiry Presets */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Auto-Destruct Expiration Time
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '0.166', label: '10 Mins' },
                    { id: '1', label: '1 Hour' },
                    { id: '6', label: '6 Hours' },
                    { id: '24', label: '24 Hours' },
                    { id: '168', label: '7 Days' },
                    { id: 'custom', label: 'Custom' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setExpiryOption(item.id as any)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                        expiryOption === item.id
                          ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white border-pink-500/50 shadow-md shadow-pink-600/20'
                          : 'bg-zinc-950/40 text-zinc-300 border-violet-500/20 hover:border-violet-500/40'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {expiryOption === 'custom' && (
                  <div className="mt-3">
                    <input
                      type="datetime-local"
                      value={customExpiryDate}
                      onChange={e => setCustomExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                )}
              </div>

              {/* Access Count Limits */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Maximum Access Limit (Views/Downloads)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: '1', label: '1 (Burner)' },
                    { id: '3', label: '3 Views' },
                    { id: '5', label: '5 Views' },
                    { id: '0', label: 'Unlimited' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMaxAccessLimit(item.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                        maxAccessLimit === item.id
                          ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white border-pink-500/50 shadow-md shadow-pink-600/20'
                          : 'bg-zinc-950/40 text-zinc-300 border-violet-500/20 hover:border-violet-500/40'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Email Restriction */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Restrict to Recipient Email (Optional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={e => setRecipientEmail(e.target.value)}
                    placeholder="client@company.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>
            </div>

            {/* Right Card: Cryptographic Gates & Watermarking */}
            <div className="p-6 glass-panel rounded-3xl border border-violet-500/20 space-y-4">
              <div className="flex items-center gap-2 border-b border-violet-500/20 pb-3">
                <Lock className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white">Cryptographic Gates</h3>
              </div>

              {/* Password Protection Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-zinc-200">Password Gate</span>
                    <p className="text-[11px] text-zinc-400">Require password before decryption</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnablePassword(!enablePassword)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      enablePassword ? 'bg-pink-600' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        enablePassword ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {enablePassword && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <div className="relative">
                      <Key className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required={enablePassword}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Set strong access password"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    {password && (
                      <div className="flex items-center justify-between text-[11px] px-1">
                        <span className="text-zinc-400">Strength: {passwordStrength.label}</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <span
                              key={s}
                              className={`w-3.5 h-1 rounded-full ${
                                s <= passwordStrength.score ? passwordStrength.color : 'bg-zinc-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* OTP 2FA Gate */}
              <div className="flex items-center justify-between pt-2 border-t border-violet-500/10">
                <div>
                  <span className="text-xs font-semibold text-zinc-200">Email OTP (2FA)</span>
                  <p className="text-[11px] text-zinc-400">Requires 6-digit code sent to email</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRequireOtp(!requireOtp)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    requireOtp ? 'bg-pink-600' : 'bg-zinc-800'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      requireOtp ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* View Only vs Download Allowed */}
              <div className="flex items-center justify-between pt-2 border-t border-violet-500/10">
                <div>
                  <span className="text-xs font-semibold text-zinc-200">Allow File Download</span>
                  <p className="text-[11px] text-zinc-400">
                    {downloadAllowed ? 'Recipient can download decrypted file' : 'View-Only in browser preview'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDownloadAllowed(!downloadAllowed)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    downloadAllowed ? 'bg-violet-600' : 'bg-zinc-800'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      downloadAllowed ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Watermark Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-violet-500/10">
                <div>
                  <span className="text-xs font-semibold text-zinc-200">Dynamic Watermarking</span>
                  <p className="text-[11px] text-zinc-400">Overlays email and timestamp on preview</p>
                </div>
                <button
                  type="button"
                  onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    watermarkEnabled ? 'bg-violet-600' : 'bg-zinc-800'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      watermarkEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Auto Revoke on Threat */}
              <div className="flex items-center justify-between pt-2 border-t border-violet-500/10">
                <div>
                  <span className="text-xs font-semibold text-zinc-200">Brute-Force Auto Revoke</span>
                  <p className="text-[11px] text-zinc-400">Instantly revoke link if 5+ failed guesses occur</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoRevokeOnSuspicious(!autoRevokeOnSuspicious)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    autoRevokeOnSuspicious ? 'bg-violet-600' : 'bg-zinc-800'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      autoRevokeOnSuspicious ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Encryption Progress Overlay during Upload */}
          {isUploading && (
            <div className="p-6 rounded-2xl bg-zinc-950/90 border border-pink-500/40 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-pink-400 flex items-center gap-2 font-bold">
                  <ShieldCheck className="w-4 h-4 animate-pulse" />
                  {encryptionStage === 'reading' && 'Buffering raw bytes...'}
                  {encryptionStage === 'encrypting' && 'Applying AES-256-GCM cipher...'}
                  {encryptionStage === 'storing' && 'Calculating SHA-256 checksum & indexing token...'}
                  {encryptionStage === 'complete' && 'Cryptographic sealing complete!'}
                </span>
                <span className="text-zinc-400">{uploadProgress}%</span>
              </div>

              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!selectedFile || isUploading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-pink-600/30 hover:shadow-pink-600/50 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Shield className="w-5 h-5" />
            <span>Encrypt File & Generate Secure Link</span>
          </button>
        </form>
      )}
    </div>
  );
};
