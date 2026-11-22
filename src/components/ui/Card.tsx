import React from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const Card: React.FC<Props> = ({ children, className = '', title, subtitle, actions }) => (
  <div className={`bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_0_rgba(18,35,26,0.04)] ${className}`}>
    {(title || actions) && (
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          {title && <h3 className="font-display font-bold text-ink text-lg leading-tight">{title}</h3>}
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    )}
    <div className={title || actions ? 'px-5 pb-5' : 'p-5'}>{children}</div>
  </div>
);
