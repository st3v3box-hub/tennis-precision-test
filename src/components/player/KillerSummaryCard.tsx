import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from 'recharts';
import type { KillerSession } from '../../types';
import { computeKillerStats, killerInsights } from '../../lib/killer';
import { Card } from '../ui/Card';

/** Killer history of one player: latest result, best, trend and key observations. */
export const KillerSummaryCard: React.FC<{ tests: KillerSession[]; print?: boolean; onNew?: () => void }> = ({ tests, print, onNew }) => {
  const navigate = useNavigate();
  const rows = useMemo(
    () => [...tests]
      .sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt))
      .map(k => ({ k, s: computeKillerStats(k) })),
    [tests]
  );
  if (rows.length === 0) {
    return onNew && !print ? (
      <Card title="Killer">
        <p className="text-sm text-gray-500 mb-3">Nessun test Killer: misura consistenza e tenuta mentale.</p>
        <button onClick={onNew} className="w-full py-2.5 rounded-xl border-2 border-brand-300 bg-brand-50 text-sm font-bold text-brand-700">🎯 Fai il test Killer</button>
      </Card>
    ) : null;
  }
  const last = rows[rows.length - 1];
  const completed = rows.filter(r => r.s.index !== null);
  const best = completed.reduce<(typeof rows)[number] | null>((b, r) => (!b || (r.s.index ?? 0) > (b.s.index ?? 0) ? r : b), null);
  const chart = completed.map(r => ({ date: r.k.date, index: Math.round(r.s.index ?? 0) }));
  const insights = killerInsights(last.s).slice(0, print ? 3 : 2);

  return (
    <Card title="Killer" subtitle="Consistenza · pazienza · concentrazione" className={print ? 'break-inside-avoid' : ''}
      actions={!print && onNew ? <button onClick={onNew} className="text-xs font-bold text-brand-600">+ Nuovo</button> : undefined}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <button onClick={() => !print && navigate(`/killer/${last.k.id}`)} className="rounded-xl bg-black text-white py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-neutral-400">Ultimo</p>
          <p className="text-2xl font-black">{last.s.index !== null ? Math.round(last.s.index) : '—'}</p>
          <p className="text-[10px] text-brand-400 font-semibold">{last.s.rating}</p>
        </button>
        <div className="rounded-xl bg-gray-50 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Migliore</p>
          <p className="text-2xl font-black">{best ? Math.round(best.s.index ?? 0) : '—'}</p>
          <p className="text-[10px] text-gray-500">{best ? best.k.date : 'nessun completato'}</p>
        </div>
        <div className="rounded-xl bg-gray-50 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Ultimo test</p>
          <p className="text-2xl font-black">{last.s.errors}</p>
          <p className="text-[10px] text-gray-500">{last.s.errors === 1 ? 'errore' : 'errori'} su {last.k.target}</p>
        </div>
      </div>
      {chart.length >= 2 && (
        <div className="h-32 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickLine={false} />
              {!print && <Tooltip formatter={(v: number) => [v, 'Indice Killer']} />}
              <Line type="monotone" dataKey="index" stroke="#111111" strokeWidth={2} dot={{ r: 3, fill: '#e10600' }} isAnimationActive={!print} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {insights.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-gray-700">
          {insights.map((t, i) => <li key={i} className="flex gap-2"><span className="text-brand-600">●</span><span>{t}</span></li>)}
        </ul>
      )}
      {!print && rows.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {[...rows].reverse().slice(0, 6).map(r => (
            <button key={r.k.id} onClick={() => navigate(`/killer/${r.k.id}`)}
              className="text-xs px-2.5 py-1 rounded-full border border-gray-200 hover:border-brand-300">
              {r.k.date} · {r.s.index !== null ? Math.round(r.s.index) : 'int.'}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
};
