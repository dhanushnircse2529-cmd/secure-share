import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface CountdownTimerProps {
  expiresAt: string | null | undefined;
  className?: string;
  onExpire?: () => void;
  showIcon?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  expiresAt,
  className = '',
  onExpire,
  showIcon = true,
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
    totalMs: number;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
    totalMs: 0,
  });

  useEffect(() => {
    if (!expiresAt) return;

    const calculate = () => {
      const target = new Date(expiresAt).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
          totalMs: 0,
        });
        if (onExpire) onExpire();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false,
        totalMs: diff,
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (!expiresAt) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-zinc-400 font-mono text-xs ${className}`}>
        {showIcon && <Clock className="w-3.5 h-3.5" />}
        No Expiration
      </span>
    );
  }

  if (timeLeft.isExpired) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-red-400 font-mono text-xs font-semibold ${className}`}>
        {showIcon && <AlertCircle className="w-3.5 h-3.5" />}
        Link Expired
      </span>
    );
  }

  const isUrgent = timeLeft.totalMs < 1000 * 60 * 60; // < 1 hour

  return (
    <div
      className={`inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-md border ${
        isUrgent
          ? 'bg-red-500/10 border-red-500/30 text-red-300 animate-pulse'
          : 'bg-violet-500/10 border-violet-500/30 text-violet-300'
      } ${className}`}
    >
      {showIcon && <Clock className="w-3.5 h-3.5" />}
      <span>
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  );
};
