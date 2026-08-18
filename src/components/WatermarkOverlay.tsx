import React from 'react';

interface WatermarkOverlayProps {
  recipientEmail?: string | null;
  className?: string;
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({
  recipientEmail,
  className = '',
}) => {
  const currentTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const identifier = recipientEmail || 'AUTHORIZED RECIPIENT';

  return (
    <div
      className={`absolute inset-0 pointer-events-none z-20 overflow-hidden flex flex-col justify-around select-none opacity-25 ${className}`}
      aria-hidden="true"
    >
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="flex justify-around transform -rotate-12 whitespace-nowrap text-pink-400/80 font-mono text-xs md:text-sm font-bold tracking-widest"
        >
          <span>SECURESHARE // {identifier} // {currentTimestamp}</span>
          <span className="hidden md:inline">SECURESHARE // {identifier} // {currentTimestamp}</span>
        </div>
      ))}
    </div>
  );
};
