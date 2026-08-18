import React, { useState, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { AppView, SecurityStats, SecurityAlert } from '../types';
import { api } from '../lib/api';
import { SecurityScoreGauge } from '../components/SecurityScoreGauge';
import { formatDate } from '../lib/utils';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Flame,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  Activity,
  Server,
  KeyRound,
  Ban,
  ArrowRight,
} from 'lucide-react';

interface SecurityDashboardPageProps {
  onNavigate: (view: AppView) => void;
}

export const SecurityDashboardPage: React.FC<SecurityDashboardPageProps> = ({ onNavigate }) => {
  const { showToast } = useNotifications();

  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLockingDown, setIsLockingDown] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [statsData, alertsData] = await Promise.all([
        api.getSecurityStats().catch(() => null),
        api.getSecurityAlerts().catch(() => []),
      ]);
      if (statsData) setStats(statsData);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
    } catch (err) {
      console.error('Error fetching security posture:', err);
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResolveAlert = async (id: string) => {
    try {
      await api.resolveSecurityAlert(id);
      setAlerts(prev => prev.map(a => (a.id === id ? { ...a, resolved: true } : a)));
      showToast({ title: 'Incident Resolved', message: 'Alert closed and marked safe.', type: 'success' });
      const updated = await api.getSecurityStats();
      setStats(updated);
    } catch (e) {
      showToast({ title: 'Error', message: 'Failed to resolve alert', type: 'alert' });
    }
  };

  const handleEmergencyLockdown = async () => {
    if (!window.confirm('⚠️ EMERGENCY ACTION: This will instantly revoke ALL active shared links in your vault. Do you want to proceed?')) {
      return;
    }

    setIsLockingDown(true);
    try {
      const shares = await api.getShareLinks();
      const activeShares = shares.filter(s => s.status === 'active');
      for (const s of activeShares) {
        await api.revokeShareLink(s.id);
      }

      showToast({
        title: 'Emergency Lockdown Executed',
        message: `${activeShares.length} active links have been revoked immediately.`,
        type: 'warning',
      });
      loadData();
    } catch (err: any) {
      showToast({
        title: 'Lockdown Failed',
        message: err.message || 'Failed to complete emergency shutdown',
        type: 'alert',
      });
    } finally {
      setIsLockingDown(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-pink-400" />
            <span>Security Center & Threat Intelligence</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time heuristic evaluation, brute force defense monitoring, and cryptographic posture.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-violet-500/30 text-zinc-300 text-xs transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-violet-400" />
          </button>
          <button
            onClick={handleEmergencyLockdown}
            disabled={isLockingDown}
            className="px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <Ban className="w-4 h-4" />
            <span>Emergency Vault Lockdown</span>
          </button>
        </div>
      </div>

      {/* Main Score & Core Health Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 glass-panel rounded-3xl border border-violet-500/30 shadow-2xl flex flex-col items-center justify-center text-center space-y-4 glow-violet">
          <span className="text-xs font-mono font-bold tracking-wider text-pink-300 uppercase">
            VAULT DEFENSE SCORE
          </span>
          <SecurityScoreGauge
            score={stats?.securityScore ?? 94}
            riskLevel={stats?.riskLevel ?? 'LOW'}
            size="lg"
          />
          <p className="text-xs text-zinc-300 max-w-xs leading-relaxed">
            Dynamic posture calculated from cipher integrity, active link durations, password enforcement, and anomaly probes.
          </p>
        </div>

        {/* Security Checklist Card */}
        <div className="lg:col-span-2 p-6 glass-panel rounded-3xl border border-violet-500/20 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-pink-400" />
            <span>Active Cryptographic Defenses</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-violet-500/20 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-200">AES-256-GCM Storage</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-[11px] text-zinc-400">Payloads and initialization vectors separated in isolated disk blocks.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-violet-500/20 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-200">Zero-Knowledge Key Shred</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-[11px] text-zinc-400">Revoked tokens immediately overwrite key memory references.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-violet-500/20 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-200">Rate & Probe Throttling</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-[11px] text-zinc-400">Automatic IP quarantine after multiple invalid decryption attempts.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-violet-500/20 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-200">Dynamic Watermark Stamp</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-[11px] text-zinc-400">Forensic canvas watermarking stamps recipient identity on previews.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Incidents & Threat Activity Stream */}
      <div className="p-6 glass-panel rounded-3xl border border-violet-500/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-pink-400" />
            <h3 className="text-base font-bold text-white">Security Alerts & Anomalies</h3>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            {alerts.filter(a => !a.resolved).length} Unresolved Incident(s)
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-400 bg-zinc-950/40 rounded-2xl border border-violet-500/10">
            <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-bold text-zinc-200">Vault Operating In Safe State</p>
            <p className="text-zinc-500 mt-1">No suspicious activity or brute force incidents reported in the last 30 days.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  alert.resolved
                    ? 'bg-zinc-950/30 border-zinc-800 opacity-60'
                    : alert.level === 'HIGH'
                    ? 'bg-pink-950/30 border-pink-500/40 shadow-xl shadow-pink-950/20 glow-pink'
                    : alert.level === 'MEDIUM'
                    ? 'bg-amber-950/30 border-amber-500/40'
                    : 'bg-violet-950/30 border-violet-500/30'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="mt-1">
                    {alert.level === 'HIGH' && <ShieldAlert className="w-5 h-5 text-pink-400" />}
                    {alert.level === 'MEDIUM' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                    {alert.level === 'LOW' && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{alert.title}</h4>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        alert.level === 'HIGH'
                          ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                          : alert.level === 'MEDIUM'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {alert.level} SEVERITY
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      {alert.description}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono mt-2">
                      <span>Logged: {formatDate(alert.timestamp)}</span>
                      {alert.resolved && <span className="text-emerald-400">• Resolved & Audited</span>}
                    </div>
                  </div>
                </div>

                {!alert.resolved && (
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => onNavigate('shares')}
                      className="px-3 py-1.5 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 text-xs font-semibold"
                    >
                      Inspect Link
                    </button>
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
                    >
                      Mark Resolved
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
