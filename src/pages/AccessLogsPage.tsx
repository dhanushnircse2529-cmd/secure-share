import React, { useState, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { AppView, AccessLog } from '../types';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';
import {
  ScrollText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  ShieldAlert,
  Laptop,
  Smartphone,
  Globe,
  RefreshCw,
} from 'lucide-react';

interface AccessLogsPageProps {
  onNavigate: (view: AppView) => void;
}

export const AccessLogsPage: React.FC<AccessLogsPageProps> = ({ onNavigate }) => {
  const { showToast } = useNotifications();

  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAccessLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Timestamp', 'File Name', 'Action', 'Status', 'IP Address', 'Device', 'Browser', 'Suspicious', 'Recipient Email'];
    const rows = logs.map(l => [
      `"${new Date(l.timestamp).toISOString()}"`,
      `"${l.fileName || 'N/A'}"`,
      `"${l.action}"`,
      `"${l.status}"`,
      `"${l.ipAddress}"`,
      `"${l.deviceType}"`,
      `"${l.browser}"`,
      `"${l.isSuspicious ? 'YES' : 'NO'}"`,
      `"${l.recipientEmail || 'N/A'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `secureshare_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({ title: 'Audit Exported', message: 'CSV file saved to downloads', type: 'success' });
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      (log.fileName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.recipientEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (suspiciousOnly && !log.isSuspicious) return false;
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ScrollText className="w-6 h-6 text-pink-400" />
            <span>Audit & Access Activity Logs</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Immutable forensic trail for all token interactions, decryption attempts, and IP addresses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-violet-500/30 text-zinc-300 text-xs transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4 text-violet-400" />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-white text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4 text-pink-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3 glass-panel rounded-2xl border border-violet-500/20">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by file, IP, or email..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-xs text-zinc-200 outline-none"
          >
            <option value="all">All Actions</option>
            <option value="view">Views</option>
            <option value="download">Downloads</option>
            <option value="password_attempt">Password Probes</option>
            <option value="otp_sent">OTP Challenges</option>
            <option value="revocation">Revocations</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={suspiciousOnly}
              onChange={e => setSuspiciousOnly(e.target.checked)}
              className="rounded text-pink-600 bg-zinc-900 border-violet-500"
            />
            <span className="flex items-center gap-1 text-pink-400 font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Suspicious Only</span>
            </span>
          </label>
        </div>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-zinc-400">
          <span className="w-6 h-6 border-2 border-pink-400 border-t-transparent rounded-full animate-spin inline-block mb-3" />
          <p>Compiling cryptographic audit ledger...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-16 glass-panel rounded-3xl border border-violet-500/20 text-center space-y-3">
          <ScrollText className="w-12 h-12 text-violet-400 mx-auto opacity-60" />
          <h3 className="text-base font-bold text-white">No Audit Records Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {searchTerm || suspiciousOnly ? 'No records match the active filters.' : 'Access logs will record when recipients access your tokens.'}
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-violet-500/20 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/60 text-zinc-400 uppercase font-mono text-[10px] tracking-wider border-b border-violet-500/20">
                <tr>
                  <th className="py-3 px-4">Status & Action</th>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">IP Address & Location</th>
                  <th className="py-3 px-4">Device & Client</th>
                  <th className="py-3 px-4">Recipient / Identifier</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-500/10 font-mono">
                {filteredLogs.map(log => {
                  const isSuccess = log.status === 'success';

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-violet-950/20 transition-colors ${
                        log.isSuspicious ? 'bg-pink-950/15' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {isSuccess ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-pink-400 shrink-0" />
                          )}
                          <div>
                            <span className="font-semibold text-zinc-200 capitalize">
                              {log.action.replace('_', ' ')}
                            </span>
                            {log.isSuspicious && (
                              <span className="ml-1.5 text-[9px] bg-pink-500/20 text-pink-300 border border-pink-500/40 px-1.5 py-0.2 rounded font-bold">
                                THREAT
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-zinc-200 font-sans font-medium truncate max-w-[180px]">
                        {log.fileName || 'Encrypted File'}
                      </td>

                      <td className="py-3.5 px-4 text-zinc-300">
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-violet-400" />
                          <span>{log.ipAddress}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-zinc-400 font-sans">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          {log.deviceType.toLowerCase().includes('mobile') ? (
                            <Smartphone className="w-3.5 h-3.5 text-pink-400" />
                          ) : (
                            <Laptop className="w-3.5 h-3.5 text-violet-400" />
                          )}
                          <span>{log.deviceType} • {log.browser}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-zinc-400 text-[11px] font-sans">
                        {log.recipientEmail ? (
                          <span className="text-pink-300">{log.recipientEmail}</span>
                        ) : (
                          <span className="text-zinc-500">Anonymous Token</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right text-zinc-400 text-[11px]">
                        {formatDate(log.timestamp)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
