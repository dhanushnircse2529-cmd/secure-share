import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { AppView, SecurityStats, FileRecord, AccessLog, SecurityAlert } from '../types';
import { api } from '../lib/api';
import { SecurityScoreGauge } from '../components/SecurityScoreGauge';
import { formatBytes, formatDate } from '../lib/utils';
import {
  FileText,
  Link2,
  Clock,
  Eye,
  Download,
  ShieldAlert,
  Upload,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FolderLock,
  Lock,
  Activity,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (view: AppView) => void;
  onOpenUpload: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenUpload }) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [recentFiles, setRecentFiles] = useState<FileRecord[]>([]);
  const [recentLogs, setRecentLogs] = useState<AccessLog[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsData, filesData, logsData, alertsData] = await Promise.all([
        api.getSecurityStats().catch(() => null),
        api.getFiles().catch(() => []),
        api.getAccessLogs().catch(() => []),
        api.getSecurityAlerts().catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      setRecentFiles(Array.isArray(filesData) ? filesData.slice(0, 5) : []);
      setRecentLogs(Array.isArray(logsData) ? logsData.slice(0, 6) : []);
      setAlerts(Array.isArray(alertsData) ? alertsData.slice(0, 4) : []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleResolveAlert = async (id: string) => {
    try {
      await api.resolveSecurityAlert(id);
      setAlerts(prev => prev.map(a => (a.id === id ? { ...a, resolved: true } : a)));
      showToast({
        title: 'Alert Resolved',
        message: 'Threat status updated in security registry.',
        type: 'success',
      });
      // Refresh stats
      const newStats = await api.getSecurityStats();
      setStats(newStats);
    } catch (e) {
      showToast({ title: 'Error', message: 'Failed to resolve alert', type: 'alert' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner / Welcome & Quick Upload */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 glass-panel rounded-3xl border border-violet-500/30 shadow-2xl relative overflow-hidden glow-violet">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Vault Overview
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Active Session
            </span>
          </div>
          <p className="text-xs text-zinc-300">
            Welcome back, <span className="font-semibold text-white">{user?.name}</span>. All stored files are currently protected under AES-256-GCM ciphering.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('security')}
            className="px-4 py-2.5 rounded-xl glass-panel-subtle hover:bg-violet-900/40 border border-violet-500/30 text-xs font-semibold text-violet-200 transition-all flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-pink-400" />
            <span>Security Posture</span>
          </button>
          <button
            onClick={onOpenUpload}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-pink-600/30 hover:shadow-pink-600/50 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload New File</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (5 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Files */}
        <div
          onClick={() => onNavigate('files')}
          className="p-4 glass-panel rounded-2xl glass-card-hover border border-violet-500/20 cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Files</span>
            <FolderLock className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {stats?.totalFiles ?? 0}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">Encrypted on disk</div>
        </div>

        {/* Active Links */}
        <div
          onClick={() => onNavigate('shares')}
          className="p-4 glass-panel rounded-2xl glass-card-hover border border-violet-500/20 cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Links</span>
            <Link2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300">
            {stats?.activeLinks ?? 0}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">Live for recipients</div>
        </div>

        {/* Expired / Revoked */}
        <div
          onClick={() => onNavigate('shares')}
          className="p-4 glass-panel rounded-2xl glass-card-hover border border-violet-500/20 cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Expired Links</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            {(stats?.expiredLinks ?? 0) + (stats?.revokedLinks ?? 0)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">Self-destructed or revoked</div>
        </div>

        {/* Total Views */}
        <div
          onClick={() => onNavigate('logs')}
          className="p-4 glass-panel rounded-2xl glass-card-hover border border-violet-500/20 cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Views</span>
            <Eye className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-pink-300">
            {stats?.totalViews ?? 0}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">Authenticated previews</div>
        </div>

        {/* Total Downloads */}
        <div
          onClick={() => onNavigate('logs')}
          className="p-4 glass-panel rounded-2xl glass-card-hover border border-violet-500/20 cursor-pointer col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Downloads</span>
            <Download className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-300">
            {stats?.totalDownloads ?? 0}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">Decrypted downloads</div>
        </div>
      </div>

      {/* Main Content Grid: Security Gauge & Threat Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Security Posture & Fast Health Check (1 Col) */}
        <div className="p-6 glass-panel rounded-3xl border border-violet-500/20 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-pink-400" />
              <span>Cybersecurity Score</span>
            </h3>
            <span className="text-[10px] font-mono text-zinc-400">REALTIME</span>
          </div>

          <SecurityScoreGauge
            score={stats?.securityScore ?? 92}
            riskLevel={stats?.riskLevel ?? 'LOW'}
            size="md"
          />

          <div className="space-y-2 pt-2 border-t border-violet-500/20">
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-zinc-400">Brute Force Defense:</span>
              <span className="text-emerald-400 font-mono font-semibold">Active</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-zinc-400">2-Factor Auth (2FA):</span>
              <span className={`font-mono font-semibold ${user?.twoFactorEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                {user?.twoFactorEnabled ? 'Enforced' : 'Optional'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-zinc-400">Suspicious Probes:</span>
              <span className="text-pink-400 font-mono font-semibold">
                {stats?.suspiciousAttempts ?? 0} detected
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('security')}
            className="w-full py-2.5 px-4 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-xs font-semibold text-violet-200 flex items-center justify-center gap-2 transition-colors"
          >
            <span>Open Threat Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Security Alerts & Suspicious Activity (2 Cols) */}
        <div className="lg:col-span-2 p-6 glass-panel rounded-3xl border border-violet-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-pink-400" />
              <h3 className="text-sm font-bold text-white">Security Alerts & Incidents</h3>
            </div>
            <button
              onClick={() => onNavigate('security')}
              className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 bg-zinc-950/40 rounded-2xl border border-violet-500/10">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-zinc-200">Zero Active Threats</p>
              <p className="text-zinc-500 mt-1">All sharing channels operating within normal security parameters.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    alert.resolved
                      ? 'bg-zinc-950/30 border-zinc-800 opacity-60'
                      : alert.level === 'HIGH'
                      ? 'bg-pink-950/30 border-pink-500/40 shadow-lg shadow-pink-950/20'
                      : alert.level === 'MEDIUM'
                      ? 'bg-amber-950/30 border-amber-500/40'
                      : 'bg-violet-950/30 border-violet-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {alert.level === 'HIGH' && <ShieldAlert className="w-4 h-4 text-pink-400" />}
                      {alert.level === 'MEDIUM' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                      {alert.level === 'LOW' && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-200">{alert.title}</span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                          alert.level === 'HIGH'
                            ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                            : alert.level === 'MEDIUM'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}>
                          {alert.level}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                        {alert.description}
                      </p>
                      <span className="text-[10px] text-zinc-500 font-mono mt-1 inline-block">
                        {formatDate(alert.timestamp)}
                      </span>
                    </div>
                  </div>

                  {!alert.resolved && (
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-200 transition-colors shrink-0 self-end sm:self-center"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Two Column Section: Recent Encrypted Files & Live Access Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Files */}
        <div className="p-6 glass-panel rounded-3xl border border-violet-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderLock className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-bold text-white">Recent Encrypted Files</h3>
            </div>
            <button
              onClick={() => onNavigate('files')}
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              <span>Manage all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentFiles.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 bg-zinc-950/40 rounded-2xl border border-violet-500/10">
              <FolderLock className="w-8 h-8 text-violet-400 mx-auto mb-2 opacity-60" />
              <p className="font-semibold text-zinc-200">No Files Uploaded Yet</p>
              <button
                onClick={onOpenUpload}
                className="mt-3 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 transition-colors"
              >
                Upload First File
              </button>
            </div>
          ) : (
            <div className="divide-y divide-violet-500/10">
              {recentFiles.map(file => (
                <div key={file.id} className="py-3 flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-pink-400 shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-pink-300 transition-colors">
                        {file.originalName}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mt-0.5">
                        <span>{formatBytes(file.size)}</span>
                        <span>•</span>
                        <span className="text-emerald-400">AES-256-GCM</span>
                        <span>•</span>
                        <span>{formatDate(file.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                      {file.activeShareCount || 0} active link{(file.activeShareCount || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Access Timeline */}
        <div className="p-6 glass-panel rounded-3xl border border-violet-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-pink-400" />
              <h3 className="text-sm font-bold text-white">Live Access Logs</h3>
            </div>
            <button
              onClick={() => onNavigate('logs')}
              className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1"
            >
              <span>Full audit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 bg-zinc-950/40 rounded-2xl border border-violet-500/10">
              <Activity className="w-8 h-8 text-pink-400 mx-auto mb-2 opacity-60" />
              <p className="font-semibold text-zinc-200">No Access Logs Recorded</p>
              <p className="text-zinc-500 mt-1">Logs will automatically populate when someone accesses your links.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentLogs.map(log => (
                <div
                  key={log.id}
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                    log.isSuspicious
                      ? 'bg-pink-950/30 border-pink-500/40'
                      : 'bg-zinc-950/40 border-violet-500/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="shrink-0">
                      {log.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-pink-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-zinc-200 capitalize">
                          {log.action.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          ({log.ipAddress})
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {log.fileName || 'Encrypted File'} • {log.deviceType}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
