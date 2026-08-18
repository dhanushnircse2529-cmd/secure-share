import React from 'react';
import { AppView } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Lock,
  Clock,
  Eye,
  Key,
  ShieldAlert,
  Zap,
  CheckCircle,
  FileKey,
  ArrowRight,
  Sparkles,
  Server,
  Layers,
  Fingerprint,
  QrCode,
  Sliders,
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: AppView) => void;
  onOpenUpload: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenUpload }) => {
  const { user, quickDemoLogin } = useAuth();

  return (
    <div className="space-y-24 py-8 pb-20">
      {/* Hero Section */}
      <section className="relative text-center max-w-4xl mx-auto px-4 pt-8">
        {/* Glow badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel-subtle border border-pink-500/30 text-pink-300 text-xs font-semibold mb-6 glow-pink">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>Zero-Knowledge File Protection & Expiry Engine</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Share Files.{' '}
          <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-light-pink bg-clip-text text-transparent">
            Stay in Control.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
          Upload sensitive files with military-grade AES-256 encryption. Share self-destructing links
          with password protection, access limits, watermarking, and real-time audit logs.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => (user ? onNavigate('upload') : onNavigate('register'))}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-pink-600/30 hover:shadow-pink-600/50 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <span>{user ? 'Upload Secure File' : 'Get Started Free'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {!user && (
            <button
              onClick={async () => {
                await quickDemoLogin();
                onNavigate('dashboard');
              }}
              className="px-6 py-3.5 rounded-xl glass-panel hover:bg-violet-900/40 border border-violet-500/40 text-violet-200 text-sm font-semibold transition-all hover:scale-105 flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-pink-400" />
              <span>Explore Demo Dashboard</span>
            </button>
          )}
        </div>

        {/* Hero Interactive Terminal / Security Preview Card */}
        <div className="mt-16 glass-panel rounded-2xl p-6 border border-violet-500/30 shadow-2xl text-left glow-violet max-w-3xl mx-auto">
          <div className="flex items-center justify-between border-b border-violet-500/20 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-zinc-400 ml-2">secureshare-engine // active</span>
            </div>
            <span className="text-[11px] font-mono text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
              AES-256-GCM
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-violet-500/20">
              <div className="text-zinc-400 text-[10px]">CIPHER SUITE</div>
              <div className="text-emerald-400 font-bold mt-1">AES-256-GCM + SHA-256</div>
              <div className="text-zinc-500 text-[10px] mt-0.5">Encrypted on upload</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-violet-500/20">
              <div className="text-zinc-400 text-[10px]">LIFETIME POLICY</div>
              <div className="text-pink-400 font-bold mt-1">Self-Destructs in 24h</div>
              <div className="text-zinc-500 text-[10px] mt-0.5">Zero persistent artifacts</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-violet-500/20">
              <div className="text-zinc-400 text-[10px]">ACCESS LIMIT</div>
              <div className="text-violet-400 font-bold mt-1">Max 3 Views Allowed</div>
              <div className="text-zinc-500 text-[10px] mt-0.5">Instant auto-revocation</div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Highlights / Core Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Enterprise Security for Everyday Sharing
          </h2>
          <p className="text-sm text-zinc-400 mt-2">
            Every layer engineered to prevent data leakage and enforce strict access boundaries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="p-6 glass-panel rounded-2xl glass-card-hover border border-violet-500/20">
            <div className="p-3 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400 w-fit mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">AES-256 Storage Encryption</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Files are encrypted with unique initialization vectors (IVs) and authentication tags before touching disk storage.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 glass-panel rounded-2xl glass-card-hover border border-violet-500/20">
            <div className="p-3 rounded-xl bg-pink-600/20 border border-pink-500/30 text-pink-400 w-fit mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Automated Expiry Links</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Set links to self-destruct after 10 minutes, 1 hour, 24 hours, or a custom deadline. Decryption becomes impossible upon expiration.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 glass-panel rounded-2xl glass-card-hover border border-violet-500/20">
            <div className="p-3 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 w-fit mb-4">
              <Key className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Password & OTP Dual Gate</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Require bcrypt-hashed access passwords and optional 6-digit email OTPs before recipient decryption is authorized.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 glass-panel rounded-2xl glass-card-hover border border-violet-500/20">
            <div className="p-3 rounded-xl bg-pink-600/20 border border-pink-500/30 text-pink-400 w-fit mb-4">
              <Sliders className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Access & Download Limits</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Enforce one-time burner links or restrict access to "View Only" mode with dynamic watermark overlays to prevent leaks.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-6 glass-panel rounded-2xl glass-card-hover border border-violet-500/20">
            <div className="p-3 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400 w-fit mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Brute-Force & Threat Detection</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Automated heuristics detect suspicious probes, repeated incorrect passwords, and abnormal IP patterns with auto-revocation.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-6 glass-panel rounded-2xl glass-card-hover border border-violet-500/20">
            <div className="p-3 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 w-fit mb-4">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Comprehensive Audit Logs</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Track timestamps, IP addresses, client devices, browsers, and success/failure statuses with instant owner alerts.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs font-mono font-bold tracking-widest text-pink-400 uppercase">
            WORKFLOW
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            How Secure Sharing Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-violet-500/20 text-center">
            <div className="w-10 h-10 rounded-full bg-violet-600/30 border border-violet-500/40 text-violet-300 font-bold flex items-center justify-center mx-auto mb-3">
              1
            </div>
            <h4 className="font-bold text-sm text-white mb-1">Upload File</h4>
            <p className="text-xs text-zinc-400">Client submits file, encrypted with AES-256 on the fly.</p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-violet-500/20 text-center">
            <div className="w-10 h-10 rounded-full bg-pink-600/30 border border-pink-500/40 text-pink-300 font-bold flex items-center justify-center mx-auto mb-3">
              2
            </div>
            <h4 className="font-bold text-sm text-white mb-1">Set Security</h4>
            <p className="text-xs text-zinc-400">Configure password, expiry time, max views, and watermarks.</p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-violet-500/20 text-center">
            <div className="w-10 h-10 rounded-full bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold flex items-center justify-center mx-auto mb-3">
              3
            </div>
            <h4 className="font-bold text-sm text-white mb-1">Share Token</h4>
            <p className="text-xs text-zinc-400">Send the generated secure link or QR code to the recipient.</p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-violet-500/20 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center mx-auto mb-3">
              4
            </div>
            <h4 className="font-bold text-sm text-white mb-1">Access & Audit</h4>
            <p className="text-xs text-zinc-400">Recipient verifies access; live audit logs notify the owner.</p>
          </div>
        </div>
      </section>

      {/* Ready to start CTA Card */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="p-8 sm:p-12 glass-panel rounded-3xl border border-pink-500/30 text-center relative overflow-hidden shadow-2xl glow-pink">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
            Secure Your Sensitive File Transfers Today
          </h3>
          <p className="text-zinc-300 text-sm mt-3 max-w-lg mx-auto">
            Zero plain-text storage, automatic link expiration, and real-time threat intelligence.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => (user ? onNavigate('upload') : onNavigate('register'))}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white text-sm font-bold shadow-xl shadow-pink-600/30 transition-all hover:scale-105 active:scale-95"
            >
              Start Sharing Securely
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
