import React, { useState, useEffect } from 'react';
import { RecipientShareMeta, DecryptedFilePayload } from '../types';
import { api } from '../lib/api';
import { CountdownTimer } from '../components/CountdownTimer';
import { WatermarkOverlay } from '../components/WatermarkOverlay';
import { formatBytes, formatDate } from '../lib/utils';
import {
  Shield,
  Lock,
  Clock,
  Download,
  Eye,
  KeyRound,
  Mail,
  AlertTriangle,
  FileCheck2,
  FileX2,
  FileText,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Ban,
  ShieldAlert,
} from 'lucide-react';

interface RecipientAccessPageProps {
  token: string;
  onBackToApp?: () => void;
}

export const RecipientAccessPage: React.FC<RecipientAccessPageProps> = ({ token, onBackToApp }) => {
  // State
  const [meta, setMeta] = useState<RecipientShareMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Authentication inputs
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // OTP State
  const [requiresOtpStep, setRequiresOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [tempOtpPreview, setTempOtpPreview] = useState<string | null>(null);

  // Decrypted Result
  const [decryptedFile, setDecryptedFile] = useState<DecryptedFilePayload | null>(null);
  const [decryptedBlobUrl, setDecryptedBlobUrl] = useState<string | null>(null);
  const [textPreviewContent, setTextPreviewContent] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Load link meta on mount
  useEffect(() => {
    fetchMeta();
  }, [token]);

  const fetchMeta = async () => {
    setIsLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);

    try {
      const res = await api.getRecipientMeta(token);
      setMeta(res);

      // If the link has NO password and NO OTP, we can verify immediately
      if (!res.isPasswordProtected && !res.otpRequired) {
        verifyAndDecrypt();
      }
    } catch (err: any) {
      setErrorStatus(err.status || 'invalid');
      setErrorMessage(err.message || 'Unable to access shared file.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndDecrypt = async (overridePassword?: string, overrideOtp?: string) => {
    setIsVerifying(true);
    setAuthError(null);

    try {
      const res = await api.verifyRecipientAccess(token, {
        password: overridePassword ?? (password || undefined),
        email: email || undefined,
        otpCode: overrideOtp ?? (otpCode || undefined),
      });

      if (res.requiresOtp) {
        setRequiresOtpStep(true);
        if (res.demoOtpCode) {
          setTempOtpPreview(res.demoOtpCode);
        }
        setIsVerifying(false);
        return;
      }

      setDecryptedFile(res);

      // Fetch decrypted file blob for browser rendering / download
      const blob = await api.fetchDecryptedBlob(token, res.accessToken);
      const blobUrl = URL.createObjectURL(blob);
      setDecryptedBlobUrl(blobUrl);

      // If it's a text/json file, fetch content to display directly
      if (res.file.mimeType.startsWith('text/') || res.file.mimeType.includes('json')) {
        const text = await blob.text();
        setTextPreviewContent(text.slice(0, 10000)); // preview first 10KB
      }
    } catch (err: any) {
      setAuthError(err.message || 'Access verification failed.');
      if (err.status === 'revoked' || err.status === 'expired' || err.status === 'limit_reached') {
        setErrorStatus(err.status);
        setErrorMessage(err.message);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownload = () => {
    if (!decryptedBlobUrl || !decryptedFile) return;
    const a = document.createElement('a');
    a.href = decryptedBlobUrl;
    a.download = decryptedFile.file.originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // State 1: Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-mono text-zinc-300">Contacting SecureShare Vault & verifying token...</p>
        </div>
      </div>
    );
  }

  // State 2: Expired / Revoked / Blocked Error Screen
  if (errorStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 glass-panel rounded-3xl border border-red-500/30 text-center space-y-5 glow-pink animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto">
            {errorStatus === 'revoked' && <Ban className="w-8 h-8" />}
            {errorStatus === 'expired' && <Clock className="w-8 h-8" />}
            {errorStatus === 'limit_reached' && <ShieldAlert className="w-8 h-8" />}
            {errorStatus === 'invalid' && <FileX2 className="w-8 h-8" />}
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">
              {errorStatus === 'revoked' && 'Access Revoked'}
              {errorStatus === 'expired' && 'Link Expired'}
              {errorStatus === 'limit_reached' && 'Access Limit Exceeded'}
              {errorStatus === 'invalid' && 'Invalid Token'}
            </h2>
            <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
              {errorMessage || 'This cryptographic share link is no longer valid or accessible.'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/60 border border-violet-500/20 text-xs text-zinc-400 font-mono">
            Zero-knowledge destruction active. Decryption keys have been shredded.
          </div>

          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all"
            >
              Return to Main App
            </button>
          )}
        </div>
      </div>
    );
  }

  // State 3: Decrypted & Authorized File View
  if (decryptedFile && decryptedBlobUrl) {
    const isImage = decryptedFile.file.mimeType.startsWith('image/');
    const isAudio = decryptedFile.file.mimeType.startsWith('audio/');
    const isVideo = decryptedFile.file.mimeType.startsWith('video/');
    const isPdf = decryptedFile.file.mimeType === 'application/pdf';

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-200">
        {/* Top bar with file meta and countdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 glass-panel rounded-3xl border border-violet-500/30 shadow-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 shrink-0">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white truncate" title={decryptedFile.file.originalName}>
                  {decryptedFile.file.originalName}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  AES-256 Decrypted
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mt-0.5">
                <span>{formatBytes(decryptedFile.file.size)}</span>
                <span>•</span>
                <span>{decryptedFile.remainingAccesses !== null ? `${decryptedFile.remainingAccesses} views left` : 'Unlimited'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {meta?.expiresAt && (
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 block font-mono">LINK DESTROYS IN:</span>
                <CountdownTimer expiresAt={meta.expiresAt} />
              </div>
            )}

            {decryptedFile.downloadAllowed && (
              <button
                onClick={handleDownload}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-600/30 flex items-center gap-2 transition-all hover:scale-105"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </button>
            )}
          </div>
        </div>

        {/* In-Browser Decrypted Preview Stage with Dynamic Watermark */}
        <div className="relative p-6 glass-panel rounded-3xl border border-violet-500/20 shadow-2xl min-h-[380px] flex items-center justify-center overflow-hidden">
          {/* Dynamic Watermark Overlay */}
          {decryptedFile.watermarkEnabled && (
            <WatermarkOverlay
              watermarkText={decryptedFile.watermarkText || `${email || 'Authorized Recipient'} • ${new Date().toLocaleDateString()}`}
            />
          )}

          {/* Rendering by MIME Type */}
          <div className="relative z-20 w-full flex justify-center">
            {isImage ? (
              <img
                src={decryptedBlobUrl}
                alt={decryptedFile.file.originalName}
                className="max-h-[500px] rounded-xl object-contain shadow-xl border border-violet-500/20"
                referrerPolicy="no-referrer"
              />
            ) : isVideo ? (
              <video
                src={decryptedBlobUrl}
                controls
                className="max-h-[450px] w-full rounded-xl shadow-xl border border-violet-500/20"
              />
            ) : isAudio ? (
              <div className="p-6 rounded-2xl bg-zinc-950/80 border border-violet-500/30 text-center w-full max-w-md space-y-4">
                <p className="text-sm font-bold text-white">{decryptedFile.file.originalName}</p>
                <audio src={decryptedBlobUrl} controls className="w-full" />
              </div>
            ) : textPreviewContent ? (
              <div className="w-full bg-zinc-950/80 p-5 rounded-2xl border border-violet-500/20 font-mono text-xs text-zinc-200 overflow-x-auto max-h-[450px]">
                <pre>{textPreviewContent}</pre>
              </div>
            ) : isPdf ? (
              <div className="w-full h-[550px] rounded-xl overflow-hidden border border-violet-500/20">
                <iframe
                  src={decryptedBlobUrl}
                  title="PDF Preview"
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="text-center p-8 space-y-3">
                <FileText className="w-16 h-16 text-pink-400 mx-auto" />
                <h4 className="text-base font-bold text-white">{decryptedFile.file.originalName}</h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  This file format ({decryptedFile.file.mimeType}) cannot be directly previewed inline.
                </p>
                {decryptedFile.downloadAllowed ? (
                  <button
                    onClick={handleDownload}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-xs shadow-lg flex items-center gap-2 mx-auto"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Decrypted Payload</span>
                  </button>
                ) : (
                  <span className="text-xs text-amber-400 font-mono">
                    Owner configured View-Only mode for this link.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Security Assurance Footer */}
        <div className="p-4 rounded-2xl bg-zinc-950/40 border border-violet-500/20 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Protected by SecureShare AES-256 Vault Architecture. Access event logged for sender security.</span>
        </div>
      </div>
    );
  }

  // State 4: Password / OTP Authentication Screen
  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 glass-panel rounded-3xl border border-violet-500/30 shadow-2xl space-y-6 glow-violet animate-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-500 p-0.5 mx-auto flex items-center justify-center text-white shadow-xl shadow-pink-500/30">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Encrypted File Access
          </h2>
          <p className="text-xs text-zinc-300">
            A protected file is waiting for you in the cryptographic vault.
          </p>
        </div>

        {/* File Meta Summary Box */}
        {meta && (
          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-violet-500/20 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-violet-500/10">
              <span className="text-zinc-400">File Name:</span>
              <span className="font-semibold text-white truncate max-w-[200px]">{meta.fileName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-violet-500/10">
              <span className="text-zinc-400">Payload Size:</span>
              <span className="font-mono text-zinc-300">{formatBytes(meta.fileSize)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-400">Expires:</span>
              <CountdownTimer expiresAt={meta.expiresAt} />
            </div>
          </div>
        )}

        {authError && (
          <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs flex items-center gap-2 animate-shake">
            <AlertTriangle className="w-4 h-4 shrink-0 text-pink-400" />
            <span>{authError}</span>
          </div>
        )}

        {/* Step: OTP Challenge */}
        {requiresOtpStep ? (
          <form
            onSubmit={e => {
              e.preventDefault();
              verifyAndDecrypt(password, otpCode);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Enter 6-Digit Email Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full text-center text-xl font-mono tracking-widest px-4 py-3 rounded-xl bg-zinc-950/80 border border-pink-500/40 text-white focus:outline-none focus:border-pink-400"
              />
            </div>

            {tempOtpPreview && (
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 text-center">
                <span className="text-zinc-400 block text-[10px]">DEMO SENTINEL OTP CODE:</span>
                <span className="font-mono font-bold text-base text-pink-300">{tempOtpPreview}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying || otpCode.length < 6}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white text-xs font-bold shadow-lg shadow-pink-600/30 transition-all hover:scale-105 disabled:opacity-50"
            >
              {isVerifying ? 'Validating Token...' : 'Verify OTP & Decrypt File'}
            </button>
          </form>
        ) : (
          /* Step: Password Challenge Form */
          <form
            onSubmit={e => {
              e.preventDefault();
              verifyAndDecrypt(password);
            }}
            className="space-y-4"
          >
            {meta?.isPasswordProtected && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Access Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter link password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-zinc-100 text-xs focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Your Email Address (For Audit & Watermarking)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-zinc-100 text-xs focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Decrypting Cipher Stream...</span>
                </span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Unlock & Decrypt Payload</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
