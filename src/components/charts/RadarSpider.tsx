import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

const STROKE_LABELS: Record<string, string> = {
  serve: 'Servizio',
  forehand: 'Forehand',
  combined: 'Combined',
  return: 'Return',
  backhand: 'Backhand',
  volley: 'Volley',
};

interface DataPoint {
  stroke: string;
  value: number;
  ideal: number;
}

interface Props {
  values: number[]; // [serve, forehand, combined, return, backhand, volley]
  compareValues?: number[];
  compareLabel?: string;
}

const STROKE_ORDER = ['serve', 'forehand', 'combined', 'return', 'backhand', 'volley'];

export const RadarSpider: React.FC<Props> = ({ values, compareValues, compareLabel }) => {
  const data: DataPoint[] = STROKE_ORDER.map((stroke, i) => ({
    stroke: STROKE_LABELS[stroke],
    value: Number((values[i] ?? 0).toFixed(2)),
    ideal: 10,
    compare: compareValues ? Number((compareValues[i] ?? 0).toFixed(2)) : undefined,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis
          dataKey="stroke"
          tick={{ fontSize: 12, fill: '#374151', fontWeight: 600 }}
        />
        <PolarRadiusAxis angle={90} domain={[0, 10]} tickCount={6} tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <Radar
          name="Sessione"
          dataKey="value"
          stroke="#16a34a"
          fill="#16a34a"
          fillOpacity={0.25}
          strokeWidth={2}
          dot={{ r: 4, fill: '#16a34a' }}
        />
        {compareValues && (
          <Radar
            name={compareLabel ?? 'Confronto'}
            dataKey="compare"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.15}
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={{ r: 3, fill: '#3b82f6' }}
          />
        )}
        <Radar
          name="Ideale"
          dataKey="ideal"
          stroke="#d1fae5"
          fill="none"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <Tooltip formatter={(v: number) => v.toFixed(2)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
};
