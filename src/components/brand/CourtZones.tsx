import React from 'react';
import type { Category, ZoneMeasures } from '../../types';
import { COURT, serveStripsFor } from '../../lib/zones';

export type ZoneKind = 'groundstroke' | 'volley' | 'serve';

interface Props {
  measures: ZoneMeasures | null;
  level: Category;
  /** Zone to emphasise; the others are drawn faintly. Undefined = all equal. */
  focus?: ZoneKind;
  /** Draw the groundstroke zone on the other side (down-the-line targets) */
  mirror?: boolean;
  showLabels?: boolean;
  className?: string;
  title?: string;
}

// Half court seen from above: net at the top, baseline at the bottom. 1 m = 20 units.
const S = 20;
const ALLEY = 1.37;
const W = COURT.halfWidth * 2 + ALLEY * 2; // doubles width 10.97
const L = COURT.serviceDepth + COURT.backDepth; // net → baseline 11.885
const PAD = 14;

const x = (m: number) => PAD + (ALLEY + m) * S; // m measured from the left singles sideline
const y = (m: number) => PAD + m * S; // m measured from the net
const fmt = (v: number) => v.toLocaleString('it-IT', { maximumFractionDigits: 2 });

/**
 * The court diagram used wherever zones are shown or chosen.
 * Geometry follows the protocol slides: groundstroke box in the back corner,
 * volley strip along the sideline, serve strips in the service box.
 */
export const CourtZones: React.FC<Props> = ({ measures, level, focus, mirror = false, showLabels = true, className = '', title }) => {
  const sw = COURT.halfWidth * 2; // singles width 8.23
  const op = (k: ZoneKind) => (focus && focus !== k ? 0.28 : 1);

  let zones: React.ReactNode = null;
  if (measures) {
    // Groundstroke: corner box behind the service line, outside fromCenter
    const gsW = Math.max(0, COURT.halfWidth - measures.gsFromCenter);
    const gsH = Math.max(0, COURT.backDepth - measures.gsFromService);
    const gsX = mirror ? 0 : COURT.halfWidth + measures.gsFromCenter;
    const gsY = COURT.serviceDepth + measures.gsFromService;

    // Volley: strip along the sideline opposite to the groundstroke box
    const vX = mirror ? sw - measures.volley : 0;

    // Serve: strips in the deuce box (right box seen from the server)
    const n = serveStripsFor(level);
    const boxL = COURT.halfWidth;
    const strips = n === 2
      ? [boxL, sw - measures.serve]
      : [boxL, boxL + (COURT.boxWidth - measures.serve) / 2, sw - measures.serve];

    const zoneFill = 'rgba(217, 240, 74, 0.82)';
    zones = (
      <>
        <g opacity={op('serve')}>
          {strips.map((sx, i) => (
            <rect key={i} x={x(sx)} y={y(0)} width={measures.serve * S} height={COURT.serviceDepth * S}
              fill={zoneFill} stroke="#d9f04a" strokeWidth={1.5} strokeDasharray="5 3" />
          ))}
        </g>
        <g opacity={op('volley')}>
          <rect x={x(vX)} y={y(0)} width={measures.volley * S} height={L * S}
            fill={zoneFill} stroke="#d9f04a" strokeWidth={1.5} strokeDasharray="5 3" />
        </g>
        <g opacity={op('groundstroke')}>
          <rect x={x(gsX)} y={y(gsY)} width={gsW * S} height={gsH * S}
            fill={zoneFill} stroke="#d9f04a" strokeWidth={1.5} strokeDasharray="5 3" />
        </g>
        {showLabels && (
          <g fontFamily="Barlow Semi Condensed, Barlow, sans-serif" fontWeight={700} fontSize={13} fill="#062a17">
            {/* Groundstroke distances */}
            <g opacity={op('groundstroke')}>
              <Dim x1={x(mirror ? sw - measures.gsFromCenter : COURT.halfWidth)} x2={x(mirror ? sw : COURT.halfWidth + measures.gsFromCenter)}
                y1={y(L - 0.9)} y2={y(L - 0.9)} label={`${fmt(measures.gsFromCenter)} m`} />
              <Dim x1={x(mirror ? 1.2 : sw - 1.2)} x2={x(mirror ? 1.2 : sw - 1.2)}
                y1={y(COURT.serviceDepth)} y2={y(COURT.serviceDepth + measures.gsFromService)} label={`${fmt(measures.gsFromService)} m`} vertical />
            </g>
            <g opacity={op('volley')}>
              <text x={x(vX + measures.volley / 2)} y={y(L * 0.62)} textAnchor="middle" fill="#062a17"
                transform={`rotate(-90 ${x(vX + measures.volley / 2)} ${y(L * 0.62)})`}>Volée {fmt(measures.volley)} m</text>
            </g>
            <g opacity={op('serve')}>
              <text x={x(boxL + COURT.boxWidth / 2)} y={y(COURT.serviceDepth) - 6} textAnchor="middle" fill="#ffffff">
                {n} × {fmt(measures.serve)} m
              </text>
            </g>
          </g>
        )}
      </>
    );
  }

  return (
    <svg viewBox={`0 0 ${W * S + PAD * 2} ${L * S + PAD * 2}`} className={className} role="img"
      aria-label={title ?? 'Campo con le zone bersaglio'}>
      {title && <title>{title}</title>}
      <rect x={0} y={0} width={W * S + PAD * 2} height={L * S + PAD * 2} rx={14} fill="#0b3a21" />
      <rect x={PAD} y={PAD} width={W * S} height={L * S} fill="#17663e" />
      {zones}
      {/* Court lines */}
      <g stroke="#ffffff" strokeWidth={2} fill="none" strokeLinecap="square">
        <rect x={PAD} y={PAD} width={W * S} height={L * S} />
        <line x1={x(0)} y1={y(0)} x2={x(0)} y2={y(L)} />
        <line x1={x(sw)} y1={y(0)} x2={x(sw)} y2={y(L)} />
        <line x1={x(0)} y1={y(COURT.serviceDepth)} x2={x(sw)} y2={y(COURT.serviceDepth)} />
        <line x1={x(COURT.halfWidth)} y1={y(0)} x2={x(COURT.halfWidth)} y2={y(COURT.serviceDepth)} />
        <line x1={x(COURT.halfWidth)} y1={y(L)} x2={x(COURT.halfWidth)} y2={y(L) - 8} />
      </g>
      {/* Net */}
      <line x1={PAD - 6} y1={PAD} x2={PAD + W * S + 6} y2={PAD} stroke="#ffffff" strokeWidth={4} />
      {!measures && (
        <text x={PAD + (W * S) / 2} y={PAD + (L * S) * 0.72} textAnchor="middle" fill="#ffffff"
          fontFamily="Barlow Semi Condensed, Barlow, sans-serif" fontWeight={700} fontSize={18}>
          Aree pari / dispari
        </text>
      )}
    </svg>
  );
};

/** Dimension line with end ticks and a label on a small dark tab */
const Dim: React.FC<{ x1: number; y1: number; x2: number; y2: number; label: string; vertical?: boolean }> = ({ x1, y1, x2, y2, label, vertical }) => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const len = vertical ? Math.abs(y2 - y1) : Math.abs(x2 - x1);
  if (len < 2) return null;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth={1.5} />
      {vertical ? (
        <>
          <line x1={x1 - 4} y1={y1} x2={x1 + 4} y2={y1} stroke="#ffffff" strokeWidth={1.5} />
          <line x1={x2 - 4} y1={y2} x2={x2 + 4} y2={y2} stroke="#ffffff" strokeWidth={1.5} />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - 4} x2={x1} y2={y1 + 4} stroke="#ffffff" strokeWidth={1.5} />
          <line x1={x2} y1={y2 - 4} x2={x2} y2={y2 + 4} stroke="#ffffff" strokeWidth={1.5} />
        </>
      )}
      <rect x={mx - 21} y={my - 9} width={42} height={18} rx={4} fill="#062a17" />
      <text x={mx} y={my + 4.5} textAnchor="middle" fill="#ffffff" fontSize={12}>{label}</text>
    </g>
  );
};
