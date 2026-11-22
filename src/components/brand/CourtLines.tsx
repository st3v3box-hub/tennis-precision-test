import React from 'react';

/** Full court seen from above, chalk lines only. Decorative background for hero areas. */
export const CourtLines: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 1097 2377" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
    <g fill="none" stroke="#ffffff" strokeWidth={10}>
      <rect x={5} y={5} width={1087} height={2367} />
      <line x1={142} y1={5} x2={142} y2={2372} />
      <line x1={955} y1={5} x2={955} y2={2372} />
      <line x1={142} y1={548} x2={955} y2={548} />
      <line x1={142} y1={1829} x2={955} y2={1829} />
      <line x1={548} y1={548} x2={548} y2={1829} />
      <line x1={548} y1={5} x2={548} y2={40} />
      <line x1={548} y1={2337} x2={548} y2={2372} />
    </g>
    <line x1={-20} y1={1188} x2={1117} y2={1188} stroke="#ffffff" strokeWidth={16} />
  </svg>
);
