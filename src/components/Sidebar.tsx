import React from 'react';
import { AppView } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Upload,
  FolderLock,
  Link2,
  ScrollText,
  ShieldCheck,
  UserCheck,
  LogOut,
  KeyRound,
  Shield,
  FileCheck2,
} from 'lucide-react';

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  activeLinksCount?: number;
  threatCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  activeLinksCount = 0,
  threatCount = 0,
}) => {
  const { logout } = useAuth();

  const navItems = [
    { id: 'dashboard' as AppView, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload' as AppView, label: 'Upload File', icon: Upload, highlight: true },
    { id: 'files' as AppView, label: 'My Files', icon: FolderLock },
    { id: 'shares' as AppView, label: 'Shared Links', icon: Link2, badge: activeLinksCount > 0 ? activeLinksCount : undefined },
    { id: 'logs' as AppView, label: 'Access Logs', icon: ScrollText },
    { id: 'security' as AppView, label: 'Security Center', icon: ShieldCheck, alertBadge: threatCount > 0 ? threatCount : undefined },
    { id: 'profile' as AppView, label: 'Profile & 2FA', icon: UserCheck },
  ];

  return (
    <aside className="w-64 shrink-0 flex flex-col justify-between p-4 glass-panel rounded-2xl border border-violet-500/20 shadow-xl h-[calc(100vh-6rem)] sticky top-20">
      <div className="space-y-6">
        {/* Navigation Group */}
        <div>
          <div className="text-[10px] font-mono font-bold tracking-wider text-violet-300 uppercase px-3 mb-2">
            CONTROL CENTER
          </div>
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600/90 to-pink-600/90 text-white shadow-lg shadow-pink-600/20 border border-pink-500/40 glow-violet'
                      : item.highlight
                      ? 'text-pink-300 hover:text-white hover:bg-pink-600/10 border border-pink-500/20'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-violet-900/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : item.highlight ? 'text-pink-400' : 'text-zinc-400 group-hover:text-violet-400'
                    }`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      {item.badge}
                    </span>
                  )}
                  {item.alertBadge !== undefined && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/30 text-pink-200 border border-pink-500/40 animate-pulse">
                      {item.alertBadge} Alert
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Security Status Box & Logout */}
      <div className="space-y-3 pt-4 border-t border-violet-500/20">
        <div className="p-3 rounded-xl bg-zinc-950/40 border border-violet-500/20 text-left">
          <div className="flex items-center gap-2 text-xs font-bold text-violet-300 mb-1">
            <Shield className="w-3.5 h-3.5 text-pink-400" />
            <span>Vault Encryption</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-snug">
            AES-256-GCM cipher with zero-knowledge tokenization active.
          </p>
        </div>

        <button
          onClick={() => {
            logout();
            onNavigate('landing');
          }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
