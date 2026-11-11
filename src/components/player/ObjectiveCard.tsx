import React from 'react';
import type { PlayerObjective } from '../../lib/objectives';
import { CATEGORY_TARGETS } from '../../lib/protocol';
import { Card } from '../ui/Card';

const STATUS: Record<PlayerObjective['status'], { label: string; cls: string }> = {
  pronto: { label: 'Pronto per salire', cls: 'bg-ok-100 text-ok-700' },
  in_corsa: { label: 'In corsa', cls: 'bg-neutral-100 text-neutral-700' },
  fermo: { label: 'Fermo', cls: 'bg-amber-100 text-amber-700' },
  nessun_dato: { label: '—', cls: 'bg-neutral-100 text-neutral-500' },
};

/** Progress towards the objective of the player's current category. */
export const ObjectiveCard: React.FC<{ objective: PlayerObjective; print?: boolean }> = ({ objective: o, print }) => {
  if (o.status === 'nessun_dato' || !o.category || o.latest === null) return null;
  const st = STATUS[o.status];
  const fill = Math.min(100, (o.latest / Math.max(1, o.target)) * 100);
  return (
    <Card title={`Obiettivo ${CATEGORY_TARGETS[o.category].label}`} className={print ? 'break-inside-avoid' : ''}
      actions={<span className={`text-xs font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>}>
      <div className="flex items-end justify-between text-sm mb-1.5">
        <span className="text-gray-600">Ultimo test <strong className="text-gray-900">{o.latest.toFixed(0)}%</strong></span>
        <span className="text-gray-600">Obiettivo <strong className="text-gray-900">{o.target.toFixed(0)}%</strong></span>
      </div>
      <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${o.gap === 0 ? 'bg-ok-500' : 'bg-brand-600'}`} style={{ width: `${fill}%` }} />
      </div>
      <p className="text-sm text-gray-700 mt-3">{o.message}</p>
      <p className="text-xs text-gray-400 mt-1">
        Migliore in categoria {o.best?.toFixed(0)}% · {o.testsInCategory} {o.testsInCategory === 1 ? 'test' : 'test'} · richiesti {o.required} di fila sopra l'obiettivo
      </p>
    </Card>
  );
};
