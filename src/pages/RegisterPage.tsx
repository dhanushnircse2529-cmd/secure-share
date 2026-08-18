import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { AppView } from '../types';
import { getPasswordStrength } from '../lib/utils';
import { Shield, Lock, Mail, User, ArrowRight, CheckCircle2 } from 'lucide-react';

interface RegisterPageProps {
  onNavigate: (view: AppView) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { register } = useAuth();
  const { showToast } = useNotifications();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreed) {
      setError('Please accept the cryptographic security terms');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await register(name, email, password);
      showToast({
        title: 'Account Created',
        message: 'Your cryptographic vault is ready.',
        type: 'success',
      });
      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      showToast({
        title: 'Registration Error',
        message: err.message || 'Could not complete registration',
        type: 'alert',
      });
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
            Create Encrypted Vault
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Zero-Knowledge File Sharing & Link Revocation
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
              Full Name or Alias
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Alex Mercer"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-zinc-100 text-xs focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
          </div>

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
                placeholder="alex@cybersecurity.corp"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-zinc-100 text-xs focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-zinc-100 text-xs focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>

            {/* Password strength meter */}
            {password && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Strength:</span>
                  <span className="font-semibold text-zinc-300">{passwordStrength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden flex gap-1">
                  {[1, 2, 3, 4, 5].map(step => (
                    <div
                      key={step}
                      className={`h-full flex-1 rounded-full transition-all duration-300 ${
                        step <= passwordStrength.score ? passwordStrength.color : 'bg-zinc-800'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-type password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-zinc-100 text-xs focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="terms"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 rounded border-violet-500 text-pink-600 focus:ring-pink-500 bg-zinc-900"
            />
            <label htmlFor="terms" className="text-[11px] text-zinc-400 leading-tight">
              I agree to AES-256 zero-knowledge storage and understand password loss is irreversible.
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-600/30 hover:shadow-pink-600/50 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Cryptographic Keys...</span>
              </span>
            ) : (
              <>
                <span>Create Vault Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-400">
          Already have an account?{' '}
          <button
            onClick={() => onNavigate('login')}
            className="text-pink-400 hover:text-pink-300 font-semibold transition-colors underline-offset-2 hover:underline"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
