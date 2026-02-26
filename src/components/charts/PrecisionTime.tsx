import React from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { PrecisionTimePoint } from '../../types';

interface Props {
  data: PrecisionTimePoint[];
}

export const PrecisionTimeChart: React.FC<Props> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Dati insufficienti per il grafico Precision–Time
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="index"
          label={{ value: 'Punto temporale', position: 'insideBottom', offset: -2, fontSize: 11 }}
          tick={{ fontSize: 11 }}
        />
        <YAxis domain={[0, 10]} tickCount={6} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => v.toFixed(2)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />

        <Bar dataKey="fh" name="FH" fill="#86efac" opacity={0.7} barSize={8} />
        <Bar dataKey="bh" name="BH" fill="#fca5a5" opacity={0.7} barSize={8} />
        <Bar dataKey="combined" name="Combined" fill="#93c5fd" opacity={0.7} barSize={8} />

        <Line
          type="monotone"
          dataKey="mean"
          name="Media baseline"
          stroke="#111827"
          strokeWidth={2.5}
          dot={{ r: 5, fill: '#111827' }}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};
