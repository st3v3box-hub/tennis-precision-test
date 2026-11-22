import React from 'react';

interface Props {
  /** Size of the emblem in px */
  size?: number;
  subtitle?: string;
  className?: string;
}

/** Emblem + typeset name, for dark (court green) backgrounds. */
export const BrandLockup: React.FC<Props> = ({ size = 72, subtitle = 'Tennis & Padel Academy', className = '' }) => (
  <div className={`flex items-center gap-4 ${className}`}>
    <img src="./logo.png" alt="" width={size} height={size} className="flex-shrink-0 drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)]" />
    <div className="leading-none">
      <p className="font-display font-extrabold text-white text-[1.7rem] tracking-tight">Gladiators Training</p>
      {subtitle && <p className="text-chalk/70 text-sm mt-1.5">{subtitle}</p>}
    </div>
  </div>
);
