import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { mean } from '../../lib/formulas';

interface Props {
  fhScores: number[];
  bhScores: number[];
}

export const SeriesLine: React.FC<Props> = ({ fhScores, bhScores }) => {
  const len = Math.max(fhScores.length, bhScores.length);
  const data = Array.from({ length: len }, (_, i) => ({
    serie: i + 1,
    fh: fhScores[i] ?? null,
    bh: bhScores[i] ?? null,
  }));

  const fhAvg = mean(fhScores);
  const bhAvg = mean(bhScores);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="serie" label={{ value: 'Serie', position: 'insideBottom', offset: -2, fontSize: 11 }} tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 10]} tickCount={6} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => v.toFixed(1)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />

        <Line
          type="monotone"
          dataKey="fh"
          name="Forehand"
          stroke="#16a34a"
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="bh"
          name="Backhand"
          stroke="#dc2626"
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
        />

        {fhScores.length > 0 && (
          <ReferenceLine
            y={fhAvg}
            stroke="#16a34a"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{ value: `FH avg ${fhAvg.toFixed(1)}`, fill: '#16a34a', fontSize: 10, position: 'right' }}
          />
        )}
        {bhScores.length > 0 && (
          <ReferenceLine
            y={bhAvg}
            stroke="#dc2626"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{ value: `BH avg ${bhAvg.toFixed(1)}`, fill: '#dc2626', fontSize: 10, position: 'right' }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};
