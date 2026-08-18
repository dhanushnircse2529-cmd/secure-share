import React, { useState, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { AppView, FileRecord, ShareLink } from '../types';
import { api } from '../lib/api';
import { formatBytes, formatDate } from '../lib/utils';
import { QRCodeModal } from '../components/QRCodeModal';
import {
  FolderLock,
  Search,
  Lock,
  Download,
  Trash2,
  Share2,
  Link2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Copy,
  Check,
  QrCode,
  Eye,
  Sliders,
  Shield,
  Key,
} from 'lucide-react';

interface MyFilesPageProps {
  onNavigate: (view: AppView) => void;
  onOpenUpload: () => void;
}

export const MyFilesPage: React.FC<MyFilesPageProps> = ({ onNavigate, onOpenUpload }) => {
  const { showToast } = useNotifications();

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Share Modal for existing file
  const [shareModalFile, setShareModalFile] = useState<FileRecord | null>(null);
  const [modalPassword, setModalPassword] = useState('');
  const [modalExpiry, setModalExpiry] = useState('24');
  const [modalMaxAccess, setModalMaxAccess] = useState('5');
  const [modalDownloadAllowed, setModalDownloadAllowed] = useState(true);
  const [modalWatermark, setModalWatermark] = useState(true);
  const [modalRequireOtp, setModalRequireOtp] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [generatedShare, setGeneratedShare] = useState<{ link: ShareLink; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const data = await api.getFiles();
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching files:', err);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleDeleteFile = async (file: FileRecord) => {
    if (!window.confirm(`Are you sure you want to permanently shred "${file.originalName}"? This will invalidate all active links.`)) {
      return;
    }

    try {
      await api.deleteFile(file.id);
      setFiles(prev => prev.filter(f => f.id !== file.id));
      showToast({
        title: 'File Securely Shredded',
        message: `"${file.originalName}" and keys destroyed from disk.`,
        type: 'warning',
      });
    } catch (err: any) {
      showToast({
        title: 'Error',
        message: err.message || 'Failed to delete file',
        type: 'alert',
      });
    }
  };

  const handleDownloadDecrypted = async (file: FileRecord) => {
    try {
      showToast({
        title: 'Decrypting File',
        message: 'Applying AES-256-GCM master key stream...',
        type: 'info',
      });
      await api.downloadOwnerFile(file.id, file.originalName);
      showToast({
        title: 'Download Ready',
        message: `Decrypted "${file.originalName}" successfully.`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Decryption Failed',
        message: err.message || 'Could not decrypt file',
        type: 'alert',
      });
    }
  };

  const handleCreateNewShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareModalFile) return;

    setIsGeneratingShare(true);
    try {
      const res = await api.createShareLink({
        fileId: shareModalFile.id,
        password: modalPassword,
        expiryHours: modalExpiry,
        maxAccessCount: Number(modalMaxAccess),
        downloadAllowed: modalDownloadAllowed,
        watermarkEnabled: modalWatermark,
        requireOtp: modalRequireOtp,
      });

      const fullUrl = `${window.location.origin}/share/${res.shareLink.token}`;
      setGeneratedShare({ link: res.shareLink, url: fullUrl });

      showToast({
        title: 'Share Link Generated',
        message: 'New protected access link is live.',
        type: 'success',
      });
      loadFiles();
    } catch (err: any) {
      showToast({
        title: 'Error',
        message: err.message || 'Failed to generate link',
        type: 'alert',
      });
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const filteredFiles = files.filter(f =>
    f.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.mimeType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FolderLock className="w-6 h-6 text-pink-400" />
            <span>Encrypted Vault Files</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {files.length} encrypted document{files.length !== 1 ? 's' : ''} stored under AES-256-GCM ciphering.
          </p>
        </div>

        <button
          onClick={onOpenUpload}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-pink-600/25 transition-all flex items-center gap-2"
        >
          <Lock className="w-4 h-4" />
          <span>Upload & Encrypt</span>
        </button>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 glass-panel rounded-2xl border border-violet-500/20">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by file name or type..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'table' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            Cards
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-zinc-400">
          <span className="w-6 h-6 border-2 border-pink-400 border-t-transparent rounded-full animate-spin inline-block mb-3" />
          <p>Scanning cryptographic vault records...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="p-16 glass-panel rounded-3xl border border-violet-500/20 text-center space-y-3">
          <FolderLock className="w-12 h-12 text-violet-400 mx-auto opacity-60" />
          <h3 className="text-base font-bold text-white">No Encrypted Files Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {searchTerm ? 'No files match your search query.' : 'Your vault is currently empty. Upload your first sensitive document.'}
          </p>
          <button
            onClick={onOpenUpload}
            className="mt-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white text-xs font-bold"
          >
            Upload File
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="glass-panel rounded-2xl border border-violet-500/20 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/60 text-zinc-400 uppercase font-mono text-[10px] tracking-wider border-b border-violet-500/20">
                <tr>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Cipher Suite</th>
                  <th className="py-3 px-4">Active Links</th>
                  <th className="py-3 px-4">Total Views</th>
                  <th className="py-3 px-4">Encrypted On</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-500/10">
                {filteredFiles.map(file => (
                  <tr key={file.id} className="hover:bg-violet-950/20 transition-colors">
                    <td className="py-3 px-4 font-semibold text-zinc-200 flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-pink-400 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="truncate max-w-[220px]" title={file.originalName}>
                        {file.originalName}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-300">
                      {formatBytes(file.size)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        AES-256-GCM
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                        (file.activeShareCount || 0) > 0
                          ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>
                        {file.activeShareCount || 0} active
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-pink-300">
                      {file.totalAccessCount || 0}
                    </td>
                    <td className="py-3 px-4 text-zinc-400 text-[11px]">
                      {formatDate(file.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setShareModalFile(file);
                            setGeneratedShare(null);
                          }}
                          className="p-1.5 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 transition-colors"
                          title="Generate Share Link"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadDecrypted(file)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 transition-colors"
                          title="Decrypt & Download (Owner)"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-500/20 text-red-400 transition-colors"
                          title="Secure Shred"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map(file => (
            <div
              key={file.id}
              className="p-5 glass-panel rounded-2xl glass-card-hover border border-violet-500/20 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="p-3 rounded-xl bg-violet-600/20 border border-violet-500/30 text-pink-400">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  AES-256-GCM
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white truncate" title={file.originalName}>
                  {file.originalName}
                </h4>
                <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mt-1">
                  <span>{formatBytes(file.size)}</span>
                  <span>•</span>
                  <span>{file.activeShareCount || 0} active links</span>
                </div>
              </div>

              <div className="pt-3 border-t border-violet-500/10 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-mono">
                  {formatDate(file.createdAt)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setShareModalFile(file);
                      setGeneratedShare(null);
                    }}
                    className="p-1.5 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 transition-colors"
                    title="Generate Share Link"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDownloadDecrypted(file)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 transition-colors"
                    title="Decrypt & Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteFile(file)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-500/20 text-red-400 transition-colors"
                    title="Secure Shred"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Modal */}
      {shareModalFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 glass-panel rounded-3xl border border-violet-500/30 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-zinc-100">
            <div className="flex items-center justify-between border-b border-violet-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-pink-400" />
                <h3 className="text-base font-bold text-white">Generate Expiry Link</h3>
              </div>
              <button
                onClick={() => {
                  setShareModalFile(null);
                  setGeneratedShare(null);
                }}
                className="text-zinc-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-zinc-300 truncate">
              File: <span className="font-semibold text-white">{shareModalFile.originalName}</span>
            </p>

            {generatedShare ? (
              <div className="space-y-4 p-4 rounded-2xl bg-zinc-950/60 border border-violet-500/20 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-white">Secure Link Active</div>

                <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-900 border border-violet-500/30">
                  <input
                    type="text"
                    readOnly
                    value={generatedShare.url}
                    className="bg-transparent text-xs text-zinc-300 px-2 w-full outline-none font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedShare.url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shrink-0"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setShowQR(true)}
                    className="px-3 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-200 hover:bg-zinc-700 flex items-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4 text-pink-400" />
                    <span>QR Code</span>
                  </button>
                  <a
                    href={generatedShare.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl bg-violet-600 text-xs text-white hover:bg-violet-500 flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Open Portal</span>
                  </a>
                </div>

                <QRCodeModal
                  isOpen={showQR}
                  onClose={() => setShowQR(false)}
                  url={generatedShare.url}
                  fileName={shareModalFile.originalName}
                  isPasswordProtected={generatedShare.link.isPasswordProtected}
                  expiresAt={generatedShare.link.expiresAt}
                />
              </div>
            ) : (
              <form onSubmit={handleCreateNewShare} className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Expiration Duration
                  </label>
                  <select
                    value={modalExpiry}
                    onChange={e => setModalExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-zinc-200 outline-none"
                  >
                    <option value="0.166">10 Minutes</option>
                    <option value="1">1 Hour</option>
                    <option value="6">6 Hours</option>
                    <option value="24">24 Hours</option>
                    <option value="168">7 Days</option>
                    <option value="0">Never (High Risk)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Max Access Limit
                  </label>
                  <select
                    value={modalMaxAccess}
                    onChange={e => setModalMaxAccess(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-zinc-200 outline-none"
                  >
                    <option value="1">1 View (Burner Link)</option>
                    <option value="3">3 Views</option>
                    <option value="5">5 Views</option>
                    <option value="10">10 Views</option>
                    <option value="0">Unlimited</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    Password Gate (Optional)
                  </label>
                  <input
                    type="password"
                    value={modalPassword}
                    onChange={e => setModalPassword(e.target.value)}
                    placeholder="Leave empty for un-passworded link"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950/60 border border-violet-500/30 text-zinc-200 outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-violet-500/10">
                  <span>Allow Decrypted Download</span>
                  <input
                    type="checkbox"
                    checked={modalDownloadAllowed}
                    onChange={e => setModalDownloadAllowed(e.target.checked)}
                    className="rounded text-pink-600 bg-zinc-900 border-violet-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span>Enable Dynamic Watermark</span>
                  <input
                    type="checkbox"
                    checked={modalWatermark}
                    onChange={e => setModalWatermark(e.target.checked)}
                    className="rounded text-pink-600 bg-zinc-900 border-violet-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span>Require Email OTP (2FA)</span>
                  <input
                    type="checkbox"
                    checked={modalRequireOtp}
                    onChange={e => setModalRequireOtp(e.target.checked)}
                    className="rounded text-pink-600 bg-zinc-900 border-violet-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isGeneratingShare}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {isGeneratingShare ? 'Generating Token...' : 'Create Secure Share Link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
