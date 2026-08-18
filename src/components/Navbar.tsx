import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { AppView } from '../types';
import {
  Shield,
  ShieldAlert,
  Bell,
  Upload,
  User as UserIcon,
  LogOut,
  Settings,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCheck,
  Lock,
} from 'lucide-react';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenUpload: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenUpload,
}) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-violet-500/20 bg-opacity-80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate(user ? 'dashboard' : 'landing')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-pink-500/25 group-hover:shadow-pink-500/40 transition-all">
            <div className="w-full h-full bg-[#160D2B] rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-[#160D2B] rounded-full animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-purple-100 to-pink-300 bg-clip-text text-transparent">
                SecureShare
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                AES-256
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono tracking-wider">
              ZERO-KNOWLEDGE EXPIRY LINKS
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Quick Upload Button */}
              <button
                onClick={onOpenUpload}
                className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white text-xs font-semibold shadow-lg shadow-pink-600/25 hover:shadow-pink-600/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Upload className="w-4 h-4" />
                <span>Upload File</span>
              </button>

              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-violet-500/20 hover:border-violet-500/40 text-zinc-300 hover:text-white transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white shadow-lg shadow-pink-500/50 animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl glass-panel border border-violet-500/30 shadow-2xl p-4 text-zinc-100 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-violet-500/20">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-pink-400" />
                        <span className="text-sm font-bold">Activity Feed</span>
                        {unreadCount > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          Mark read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-violet-500/10 mt-2 space-y-1">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-zinc-400">
                          No recent activity recorded
                        </div>
                      ) : (
                        notifications.slice(0, 10).map(n => (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (!n.read) markAsRead(n.id);
                            }}
                            className={`p-3 rounded-xl transition-all cursor-pointer flex items-start gap-3 ${
                              n.read
                                ? 'opacity-60 hover:opacity-90 hover:bg-zinc-800/40'
                                : 'bg-violet-950/40 border border-violet-500/20 hover:border-violet-500/40'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {n.type === 'alert' && <AlertOctagon className="w-4 h-4 text-pink-400" />}
                              {n.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                              {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                              {n.type === 'info' && <Info className="w-4 h-4 text-violet-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-zinc-200">{n.title}</p>
                              <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">
                                {n.message}
                              </p>
                              <span className="text-[10px] text-zinc-500 font-mono mt-1 inline-block">
                                {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-pink-500 mt-1.5 shrink-0" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 pl-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-violet-500/20 hover:border-violet-500/40 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-medium text-zinc-200 hidden md:inline truncate max-w-[120px]">
                    {user.name}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-3 w-56 rounded-2xl glass-panel border border-violet-500/30 shadow-2xl p-2 text-zinc-100 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-3 border-b border-violet-500/20">
                      <p className="text-xs font-bold text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          user.twoFactorEnabled
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          2FA {user.twoFactorEnabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onNavigate('profile');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-violet-600/20 rounded-xl transition-colors"
                      >
                        <Settings className="w-4 h-4 text-violet-400" />
                        Account & Security
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onNavigate('security');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-violet-600/20 rounded-xl transition-colors"
                      >
                        <ShieldAlert className="w-4 h-4 text-pink-400" />
                        Threat Center
                      </button>
                    </div>

                    <div className="pt-1 border-t border-violet-500/20">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                          onNavigate('landing');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => onNavigate('login')}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white text-xs font-semibold shadow-lg shadow-pink-600/25 hover:shadow-pink-600/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
