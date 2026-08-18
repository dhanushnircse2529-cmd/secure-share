import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, ExternalLink, ShieldCheck, Download } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  fileName: string;
  isPasswordProtected: boolean;
  expiresAt: string | null | undefined;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  url,
  fileName,
  isPasswordProtected,
  expiresAt,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('secureshare-qr-code');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#160D2B';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `SecureShare-QR-${fileName.replace(/\.[^/.]+$/, '')}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-md p-6 glass-panel rounded-2xl border border-violet-500/30 shadow-2xl text-zinc-100 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-violet-600/20 to-pink-600/20 border border-violet-500/30 text-pink-400 mb-3 glow-pink">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Encrypted Share Link QR</h3>
          <p className="text-xs text-zinc-400 mt-1 truncate px-4">
            {fileName}
          </p>
        </div>

        {/* QR Box */}
        <div className="p-4 bg-white rounded-2xl flex items-center justify-center shadow-inner mx-auto w-fit mb-6 border-4 border-violet-500/30">
          <QRCodeSVG
            id="secureshare-qr-code"
            value={url}
            size={200}
            level="H"
            includeMargin={true}
            fgColor="#160D2B"
            bgColor="#FFFFFF"
          />
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {isPasswordProtected && (
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-medium">
              Password Protected
            </span>
          )}
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-medium">
            AES-256 Verified
          </span>
        </div>

        {/* Link Input & Actions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950/60 border border-violet-500/20">
            <input
              type="text"
              readOnly
              value={url}
              className="bg-transparent text-xs text-zinc-300 w-full px-2 outline-none font-mono"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownloadQR}
              className="w-full py-2.5 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-4 h-4 text-violet-400" />
              Save QR Code
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-pink-600/20"
            >
              <ExternalLink className="w-4 h-4" />
              Open Portal
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
