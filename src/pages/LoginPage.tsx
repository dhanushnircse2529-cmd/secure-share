import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { AppView } from '../types';
import { Shield, Lock, Mail, ArrowRight, Zap, KeyRound } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (view: AppView) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login, quickDemoLogin } = useAuth();
  const { showToast } = useNotifications();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      showToast({
        title: 'Authentication Successful',
        message: 'Cryptographic session initialized.',
        type: 'success',
      });
      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      showToast({
        title: 'Login Failed',
        message: err.message || 'Invalid credentials',
        type: 'alert',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await quickDemoLogin();
      showToast({
        title: 'Demo Sentinel Activated',
        message: 'Signed in as demo security admin.',
        type: 'success',
      });
      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md p-8 glass-panel rounded-3xl border border-violet-500/30 shadow-2xl relative overflow-hidden glow-violet animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-500 border border-violet-400/30 text-white mb-3 shadow-lg shadow-pink-500/25">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Sign In to SecureShare
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Zero-Knowledge Cryptographic Vault Access
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-zinc-100 text-xs focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Master Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-[11px] text-pink-400 hover:text-pink-300 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-zinc-100 text-xs focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-600/30 hover:shadow-pink-600/50 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying Cryptographic Credentials...</span>
              </span>
            ) : (
              <>
                <span>Authenticate & Access Vault</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="my-6 flex items-center justify-between gap-3 text-zinc-500 text-[11px]">
          <div className="h-px bg-violet-500/20 flex-1" />
          <span>OR</span>
          <div className="h-px bg-violet-500/20 flex-1" />
        </div>

        <button
          onClick={handleDemoLogin}
          disabled={isLoading}
          type="button"
          className="w-full py-2.5 px-4 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-violet-500/30 text-xs font-semibold text-violet-200 flex items-center justify-center gap-2 transition-all hover:border-violet-400"
        >
          <Zap className="w-4 h-4 text-pink-400" />
          <span>Quick Demo Sentinel Login</span>
        </button>

        <div className="mt-6 text-center text-xs text-zinc-400">
          Don't have an account?{' '}
          <button
            onClick={() => onNavigate('register')}
            className="text-pink-400 hover:text-pink-300 font-semibold transition-colors underline-offset-2 hover:underline"
          >
            Create one now
          </button>
        </div>
      </div>

      {/* Forgot password dialog */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 glass-panel rounded-2xl border border-violet-500/30 text-center">
            <KeyRound className="w-8 h-8 text-pink-400 mx-auto mb-2" />
            <h3 className="text-base font-bold text-white">Reset Master Password</h3>
            <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
              Because SecureShare utilizes end-to-end cryptographic hashing, passwords cannot be recovered by server administrators. You can log in using your Demo Sentinel credentials or create a new vault account anytime.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-200 hover:bg-zinc-700"
              >
                Understood
              </button>
              <button
                onClick={() => {
                  setShowForgotModal(false);
                  handleDemoLogin();
                }}
                className="px-4 py-2 rounded-xl bg-violet-600 text-xs text-white hover:bg-violet-500"
              >
                Use Demo Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
