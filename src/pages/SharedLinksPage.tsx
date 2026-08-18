import React, { useState, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { AppView, ShareLink } from '../types';
import { api } from '../lib/api';
import { CountdownTimer } from '../components/CountdownTimer';
import { QRCodeModal } from '../components/QRCodeModal';
import { formatDate } from '../lib/utils';
import {
  Link2,
  Lock,
  Clock,
  Eye,
  ShieldAlert,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Trash2,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
} from 'lucide-react';

interface SharedLinksPageProps {
  onNavigate: (view: AppView) => void;
  onOpenUpload: () => void;
}

export const SharedLinksPage: React.FC<SharedLinksPageProps> = ({ onNavigate, onOpenUpload }) => {
  const { showToast } = useNotifications();

  const [links, setLinks] = useState<ShareLink[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'revoked'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // QR Modal
  const [selectedQR, setSelectedQR] = useState<{ url: string; fileName: string; isProtected: boolean; expiresAt?: string | null } | null>(null);

  const loadLinks = async () => {
    try {
      setIsLoading(true);
      const data = await api.getShareLinks();
      setLinks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching share links:', err);
      setLinks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  const getFullShareUrl = (token: string) => {
    return `${window.location.origin}/share/${token}`;
  };

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(getFullShareUrl(token));
    setCopiedToken(token);
    showToast({ title: 'Copied', message: 'Share URL copied to clipboard', type: 'info' });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleRevoke = async (link: ShareLink) => {
    if (!window.confirm(`Instantly revoke access token ${link.token.slice(0, 8)}...? No recipient will be able to decrypt the file.`)) {
      return;
    }

    try {
      await api.revokeShareLink(link.id);
      showToast({
        title: 'Link Revoked',
        message: 'Token permanently invalidated.',
        type: 'warning',
      });
      loadLinks();
    } catch (err: any) {
      showToast({
        title: 'Revoke Failed',
        message: err.message || 'Could not revoke link',
        type: 'alert',
      });
    }
  };

  const handleDelete = async (link: ShareLink) => {
    if (!window.confirm('Delete this share link record?')) return;

    try {
      await api.deleteShareLink(link.id);
      setLinks(prev => prev.filter(l => l.id !== link.id));
      showToast({
        title: 'Link Removed',
        message: 'Share link record deleted.',
        type: 'info',
      });
    } catch (err: any) {
      showToast({
        title: 'Error',
        message: err.message || 'Failed to delete record',
        type: 'alert',
      });
    }
  };

  const filteredLinks = links.filter(l => {
    const matchesSearch =
      (l.fileName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.token.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.recipientEmail || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return l.status === 'active';
    if (filterStatus === 'expired') return l.status === 'expired' || l.status === 'limit_reached';
    if (filterStatus === 'revoked') return l.status === 'revoked';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Link2 className="w-6 h-6 text-pink-400" />
            <span>Shared Links & Access Channels</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage active tokens, inspect expiry timers, view access counters, and revoke access instantly.
          </p>
        </div>

        <button
          onClick={onOpenUpload}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-pink-600/25 transition-all flex items-center gap-2"
        >
          <span>Generate New Link</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 glass-panel rounded-2xl border border-violet-500/20">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by file name or token..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto overflow-x-auto">
          {(['all', 'active', 'expired', 'revoked'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                filterStatus === tab
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* List / Cards */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-zinc-400">
          <span className="w-6 h-6 border-2 border-pink-400 border-t-transparent rounded-full animate-spin inline-block mb-3" />
          <p>Loading share link registry...</p>
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="p-16 glass-panel rounded-3xl border border-violet-500/20 text-center space-y-3">
          <Link2 className="w-12 h-12 text-violet-400 mx-auto opacity-60" />
          <h3 className="text-base font-bold text-white">No Share Links Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {searchTerm ? 'No links match your filter criteria.' : 'Create an encrypted link from the Upload page or My Files.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLinks.map(link => {
            const isLive = link.status === 'active';
            const url = getFullShareUrl(link.token);

            return (
              <div
                key={link.id}
                className={`p-5 glass-panel rounded-2xl border transition-all space-y-4 ${
                  !isLive
                    ? 'border-zinc-800 bg-zinc-950/40 opacity-75'
                    : 'border-violet-500/30 hover:border-pink-500/40 shadow-xl'
                }`}
              >
                {/* Top Row: File Name, Status Badge, and Primary Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2.5 rounded-xl border shrink-0 ${
                      link.isRevoked
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : link.isExpired || link.isLimitReached
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-gradient-to-tr from-violet-600/20 to-pink-600/20 border-violet-500/30 text-pink-400'
                    }`}>
                      <Link2 className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white truncate" title={link.fileName}>
                          {link.fileName || 'Encrypted File'}
                        </h4>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          link.isRevoked
                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                            : link.isExpired
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : link.isLimitReached
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {link.status?.toUpperCase().replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-mono mt-1">
                        <span className="text-violet-300 font-semibold">Token: {link.token.slice(0, 8)}...</span>
                        <span>•</span>
                        <span>Created {formatDate(link.createdAt)}</span>
                        {link.recipientEmail && (
                          <>
                            <span>•</span>
                            <span className="text-pink-300 font-normal">Restricted to: {link.recipientEmail}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopy(link.token)}
                      className="px-3 py-1.5 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-violet-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      {copiedToken === link.token ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedToken === link.token ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={() =>
                        setSelectedQR({
                          url,
                          fileName: link.fileName || 'Encrypted File',
                          isProtected: link.isPasswordProtected,
                          expiresAt: link.expiresAt,
                        })
                      }
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors"
                      title="Show QR Code"
                    >
                      <QrCode className="w-4 h-4 text-pink-400" />
                    </button>

                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors"
                      title="Test Recipient Portal"
                    >
                      <ExternalLink className="w-4 h-4 text-violet-400" />
                    </a>

                    {isLive && (
                      <button
                        onClick={() => handleRevoke(link)}
                        className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <AlertOctagon className="w-3.5 h-3.5" />
                        <span>Revoke</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(link)}
                      className="p-2 rounded-xl bg-zinc-800/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Security Badges, Access Progress, and Countdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-violet-500/10 text-xs">
                  {/* Security tags */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {link.isPasswordProtected ? (
                      <span className="px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-300 border border-pink-500/20 text-[11px] flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Password Protected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700 text-[11px]">
                        No Password
                      </span>
                    )}

                    {link.otpRequired && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px]">
                        OTP 2FA
                      </span>
                    )}

                    {link.watermarkEnabled && (
                      <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20 text-[11px]">
                        Watermarked
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px]">
                      {link.downloadAllowed ? 'Download Enabled' : 'View Only'}
                    </span>
                  </div>

                  {/* Access count */}
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-400">Access Count:</span>
                    <span className="font-mono font-bold text-white">
                      {link.accessCount} / {link.maxAccessCount > 0 ? link.maxAccessCount : '∞'}
                    </span>
                  </div>

                  {/* Countdown Timer */}
                  <div className="flex items-center sm:justify-end gap-2">
                    <span className="text-zinc-400">Expiry:</span>
                    <CountdownTimer expiresAt={link.expiresAt} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Modal */}
      {selectedQR && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setSelectedQR(null)}
          url={selectedQR.url}
          fileName={selectedQR.fileName}
          isPasswordProtected={selectedQR.isProtected}
          expiresAt={selectedQR.expiresAt}
        />
      )}
    </div>
  );
};
