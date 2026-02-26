import React from 'react';
import type { StrokeStats } from '../../types';

interface Props {
  stats: StrokeStats[];
  radarArea: number;
  percentOfIdeal: number;
}

const barColor = (v: number): string => {
  if (v >= 8) return 'bg-green-500';
  if (v >= 5) return 'bg-yellow-500';
  return 'bg-red-400';
};

export const StatsTable: React.FC<Props> = ({ stats, radarArea, percentOfIdeal }) => (
  <div className="space-y-4">
    <div className="rounded-xl overflow-hidden border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 text-gray-600 font-semibold">Stroke</th>
            <th className="text-center px-3 py-3 text-gray-600 font-semibold">Ave</th>
            <th className="text-center px-3 py-3 text-gray-600 font-semibold">Dev</th>
            <th className="text-left px-3 py-3 text-gray-600 font-semibold hidden sm:table-cell">Barra</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(s => (
            <tr key={s.stroke} className="border-b border-gray-100 last:border-0">
              <td className="px-4 py-3 font-semibold text-gray-800">{s.label}</td>
              <td className="px-3 py-3 text-center font-bold text-lg">
                <span className={
                  s.ave >= 8 ? 'text-green-600' :
                  s.ave >= 5 ? 'text-yellow-600' :
                  'text-red-500'
                }>
                  {s.ave.toFixed(2)}
                </span>
              </td>
              <td className="px-3 py-3 text-center text-gray-500 text-sm">
                ±{s.dev.toFixed(2)}
              </td>
              <td className="px-3 py-3 hidden sm:table-cell">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${barColor(s.ave)}`}
                      style={{ width: `${(s.ave / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8">{(s.ave / 10 * 100).toFixed(0)}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
        <div className="text-2xl font-black text-gray-800">{radarArea.toFixed(1)}</div>
        <div className="text-xs text-gray-500 mt-1">Area Radar</div>
        <div className="text-xs text-gray-400 mt-0.5">Ideale: {(25 * Math.sqrt(3)).toFixed(1)}</div>
      </div>
      <div className={`rounded-xl p-4 text-center border ${
        percentOfIdeal >= 70 ? 'bg-green-50 border-green-200' :
        percentOfIdeal >= 40 ? 'bg-yellow-50 border-yellow-200' :
        'bg-red-50 border-red-200'
      }`}>
        <div className={`text-2xl font-black ${
          percentOfIdeal >= 70 ? 'text-green-700' :
          percentOfIdeal >= 40 ? 'text-yellow-700' :
          'text-red-600'
        }`}>
          {percentOfIdeal.toFixed(1)}%
        </div>
        <div className="text-xs text-gray-500 mt-1">% Ideale</div>
        <div className="text-xs text-gray-400 mt-0.5">(tutti i colpi = 10)</div>
      </div>
    </div>
  </div>
);
