import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { AppView } from '../types';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';
import {
  User,
  Mail,
  Lock,
  Shield,
  KeyRound,
  CheckCircle2,
  QrCode,
  LogOut,
  Smartphone,
  Cpu,
  Fingerprint,
} from 'lucide-react';

interface ProfilePageProps {
  onNavigate: (view: AppView) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, refreshUser, logout } = useAuth();
  const { showToast } = useNotifications();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [twoFactorActive, setTwoFactorActive] = useState(user?.twoFactorEnabled || false);
  const [isUpdating2FA, setIsUpdating2FA] = useState(false);
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast({ title: 'Input Missing', message: 'Fill in current and new password', type: 'alert' });
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast({ title: 'Mismatch', message: 'New passwords do not match', type: 'alert' });
      return;
    }

    if (newPassword.length < 8) {
      showToast({ title: 'Weak Password', message: 'Minimum 8 characters required', type: 'alert' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      showToast({
        title: 'Master Password Updated',
        message: 'Cryptographic salt re-derived successfully.',
        type: 'success',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast({
        title: 'Password Update Failed',
        message: err.message || 'Verification of current password failed',
        type: 'alert',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleToggle2FA = async () => {
    if (!twoFactorActive) {
      // Opening setup
      setShow2FASetupModal(true);
      return;
    }

    // Disable 2FA
    setIsUpdating2FA(true);
    try {
      await api.updateProfile({ twoFactorEnabled: false });
      setTwoFactorActive(false);
      await refreshUser();
      showToast({ title: '2FA Disabled', message: 'Two-factor authentication turned off.', type: 'info' });
    } catch (e: any) {
      showToast({ title: 'Error', message: e.message || 'Failed to update 2FA', type: 'alert' });
    } finally {
      setIsUpdating2FA(false);
    }
  };

  const confirm2FAEnable = async () => {
    setIsUpdating2FA(true);
    try {
      await api.updateProfile({ twoFactorEnabled: true });
      setTwoFactorActive(true);
      await refreshUser();
      setShow2FASetupModal(false);
      showToast({
        title: '2-Factor Authenticator Enforced',
        message: 'OTP challenge active for login sessions.',
        type: 'success',
      });
    } catch (e: any) {
      showToast({ title: 'Error', message: 'Failed to activate 2FA', type: 'alert' });
    } finally {
      setIsUpdating2FA(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <User className="w-6 h-6 text-pink-400" />
          <span>Security Profile & Master Credentials</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Configure master access tokens, two-factor authentication gates, and review cipher capabilities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <div className="p-6 glass-panel rounded-3xl border border-violet-500/20 space-y-4 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-violet-600 to-pink-500 p-0.5 mx-auto flex items-center justify-center text-white shadow-xl shadow-pink-500/25">
            <User className="w-10 h-10" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">{user?.name}</h3>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">{user?.email}</p>
          </div>

          <div className="pt-3 border-t border-violet-500/10 space-y-2 text-left text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Account Status:</span>
              <span className="text-emerald-400 font-semibold font-mono">ENCRYPTED</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Member Since:</span>
              <span className="text-zinc-200 font-mono">{user ? formatDate(user.createdAt) : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>2-Factor Auth:</span>
              <span className={`font-mono font-semibold ${twoFactorActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                {twoFactorActive ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              onNavigate('landing');
            }}
            className="w-full mt-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>

        {/* Password & 2FA Settings (2 Cols) */}
        <div className="md:col-span-2 space-y-6">
          {/* Two-Factor Authentication Box */}
          <div className="p-6 glass-panel rounded-3xl border border-violet-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-pink-400" />
                <div>
                  <h4 className="text-sm font-bold text-white">Two-Factor Authentication (2FA)</h4>
                  <p className="text-[11px] text-zinc-400">Enforce secondary OTP challenge for login authentication</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggle2FA}
                disabled={isUpdating2FA}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  twoFactorActive ? 'bg-pink-600' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    twoFactorActive ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Change Master Password Box */}
          <div className="p-6 glass-panel rounded-3xl border border-violet-500/20 space-y-4">
            <div className="flex items-center gap-2 border-b border-violet-500/20 pb-3">
              <KeyRound className="w-5 h-5 text-violet-400" />
              <h4 className="text-sm font-bold text-white">Update Master Vault Password</h4>
            </div>

            <form onSubmit={handlePasswordUpdate} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-zinc-200 outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1.5">
                    New Master Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-zinc-200 outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-zinc-200 outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {isUpdatingPassword ? 'Updating Hash Records...' : 'Save New Master Password'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      {show2FASetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 glass-panel rounded-3xl border border-violet-500/30 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <Smartphone className="w-10 h-10 text-pink-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Enable 2-Factor Authentication</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              When enabled, any recipient requiring 2FA or sensitive account actions will generate instant OTP security codes.
            </p>

            <div className="p-3 rounded-2xl bg-zinc-950/80 border border-violet-500/30 text-xs font-mono text-emerald-400">
              OTP Algorithm: SHA-256 HMAC 6-Digit
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setShow2FASetupModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={confirm2FAEnable}
                disabled={isUpdating2FA}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-xs text-white font-bold hover:scale-105 transition-transform"
              >
                Confirm & Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
