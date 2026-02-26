import React from 'react';
import type { SeriesResult } from '../../types';
import type { SeriesSpec } from '../../lib/protocol';
import { ScoreInput } from '../ui/ScoreInput';

interface Props {
  specs: SeriesSpec[];
  series: SeriesResult[];
  onSet: (result: SeriesResult) => void;
  extraRender?: (spec: SeriesSpec, idx: number) => React.ReactNode;
}

const directionLabel: Record<string, string> = {
  fh_cross: '🎾 FH Incrociato',
  bh_cross: '🎾 BH Incrociato',
  lungolinea: '➡️ Lungolinea',
  diagonale: '↗️ Diagonale',
  right: '→ Da Destra',
  left: '← Da Sinistra',
  fh_volley: '⚡ FH Volee',
  bh_volley: '⚡ BH Volee',
};

export const SeriesInputBlock: React.FC<Props> = ({ specs, series, onSet, extraRender }) => {
  const getValue = (spec: SeriesSpec): number | null => {
    const found = series.find(
      s => s.testType === spec.testType && s.seriesIndex === spec.seriesIndex
    );
    return found?.score ?? null;
  };

  const completed = specs.filter(s => getValue(s) !== null).length;
  const total = specs.length;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-500">Completate</span>
        <span className={`text-sm font-bold ${completed === total ? 'text-green-600' : 'text-gray-700'}`}>
          {completed} / {total}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
        <div
          className="bg-green-500 h-1.5 rounded-full transition-all"
          style={{ width: `${(completed / total) * 100}%` }}
        />
      </div>

      <div className="space-y-4">
        {specs.map((spec, idx) => {
          const val = getValue(spec);
          const dirLabel = spec.direction ? directionLabel[spec.direction] : '';
          const serveLabel = spec.serveType
            ? `${spec.serveType === 'prima' ? '1ª' : '2ª'} Servizio · ${spec.side === 'right' ? 'Destra' : 'Sinistra'}`
            : '';

          return (
            <div
              key={spec.seriesIndex}
              className={`rounded-xl border-2 p-4 transition-colors
                ${val !== null ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Serie {spec.seriesIndex + 1}
                  </span>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">
                    {dirLabel || serveLabel}
                  </p>
                </div>
                {val !== null && (
                  <span className={`text-xl font-black
                    ${val >= 8 ? 'text-green-600' : val >= 5 ? 'text-yellow-600' : 'text-red-500'}
                  `}>
                    {val}
                  </span>
                )}
              </div>

              {extraRender?.(spec, idx)}

              <ScoreInput
                value={val}
                onChange={score =>
                  onSet({
                    testType: spec.testType,
                    seriesIndex: spec.seriesIndex,
                    score,
                    direction: spec.direction,
                    serveType: spec.serveType,
                    side: spec.side,
                  })
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
