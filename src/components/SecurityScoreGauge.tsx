import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

interface SecurityScoreGaugeProps {
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  size?: 'sm' | 'md' | 'lg';
}

export const SecurityScoreGauge: React.FC<SecurityScoreGaugeProps> = ({
  score,
  riskLevel,
  size = 'md',
}) => {
  const normalizedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = 283 - (283 * normalizedScore) / 100;

  const colorConfig = {
    LOW: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      stroke: '#34d399',
      label: 'Safe',
      icon: ShieldCheck,
    },
    MEDIUM: {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      stroke: '#fbbf24',
      label: 'Elevated Risk',
      icon: ShieldAlert,
    },
    HIGH: {
      text: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/30',
      stroke: '#f43f5e',
      label: 'Critical Alert',
      icon: ShieldX,
    },
  }[riskLevel];

  const Icon = colorConfig.icon;

  if (size === 'sm') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${colorConfig.bg} ${colorConfig.border} ${colorConfig.text} text-xs font-semibold`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{normalizedScore}/100</span>
        <span className="opacity-80">({colorConfig.label})</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="42"
            className="stroke-zinc-800/80"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke={colorConfig.stroke}
            strokeWidth="8"
            strokeDasharray="264"
            strokeDashoffset={264 - (264 * normalizedScore) / 100}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className={`text-2xl font-bold font-mono ${colorConfig.text}`}>
            {normalizedScore}
          </span>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
            Score
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-4 h-4 ${colorConfig.text}`} />
          <span className={`text-sm font-bold ${colorConfig.text}`}>
            {riskLevel} RISK: {colorConfig.label}
          </span>
        </div>
        <p className="text-xs text-zinc-400 max-w-[200px] leading-relaxed">
          {riskLevel === 'LOW' && 'All encryption keys, link expiries, and 2FA policies are well secured.'}
          {riskLevel === 'MEDIUM' && 'Some links have no expiration or minor failed attempt spikes.'}
          {riskLevel === 'HIGH' && 'Active brute-force attempt or high-risk alert requires immediate review.'}
        </p>
      </div>
    </div>
  );
};
