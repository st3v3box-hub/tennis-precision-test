import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import type { SeriesResult } from '../../types';
import { mean } from '../../lib/formulas';

interface Props {
  serveSeries: SeriesResult[];
}

const stripColor: Record<string, string> = {
  T: '#f59e0b',
  body: '#6366f1',
  wide: '#ec4899',
};

export const ServeChart: React.FC<Props> = ({ serveSeries }) => {
  const prima = serveSeries.filter(s => s.serveType === 'prima').sort((a, b) => a.seriesIndex - b.seriesIndex);
  const seconda = serveSeries.filter(s => s.serveType === 'seconda').sort((a, b) => a.seriesIndex - b.seriesIndex);

  const data = Array.from({ length: Math.max(prima.length, seconda.length) }, (_, i) => ({
    name: `P${i + 1}`,
    '1ª Servizio': prima[i]?.score ?? null,
    '2ª Servizio': seconda[i]?.score ?? null,
    strip1: prima[i]?.targetStrip ?? '',
    strip2: seconda[i]?.targetStrip ?? '',
  }));

  const avg1 = mean(prima.map(s => s.score));
  const avg2 = mean(seconda.map(s => s.score));

  // Strip distribution
  const stripCounts = (arr: SeriesResult[]) =>
    ['T', 'body', 'wide'].map(s => ({ strip: s, count: arr.filter(r => r.targetStrip === s).length }));

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 10]} tickCount={6} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => v?.toFixed(1)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          <Bar dataKey="1ª Servizio" fill="#f97316" radius={[4, 4, 0, 0]} />
          <Bar dataKey="2ª Servizio" fill="#8b5cf6" radius={[4, 4, 0, 0]} />

          {prima.length > 0 && (
            <ReferenceLine
              y={avg1}
              stroke="#f97316"
              strokeDasharray="5 3"
              label={{ value: `1ª avg ${avg1.toFixed(1)}`, fill: '#f97316', fontSize: 10 }}
            />
          )}
          {seconda.length > 0 && (
            <ReferenceLine
              y={avg2}
              stroke="#8b5cf6"
              strokeDasharray="5 3"
              label={{ value: `2ª avg ${avg2.toFixed(1)}`, fill: '#8b5cf6', fontSize: 10 }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>

      {/* Strip distribution */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: '1ª Servizio', arr: prima },
          { label: '2ª Servizio', arr: seconda },
        ].map(({ label, arr }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">{label} — Strisce</p>
            <div className="flex gap-2">
              {stripCounts(arr).map(({ strip, count }) => (
                <div key={strip} className="flex-1 text-center">
                  <div
                    className="rounded-lg py-1 text-white text-xs font-bold"
                    style={{ backgroundColor: stripColor[strip] }}
                  >
                    {strip}
                  </div>
                  <div className="text-sm font-bold mt-1">{count}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
