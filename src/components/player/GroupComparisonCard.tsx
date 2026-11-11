import React from 'react';
import type { GroupComparison } from '../../lib/objectives';
import { CATEGORY_TARGETS } from '../../lib/protocol';
import { Card } from '../ui/Card';

function phrase(p: number): string {
  if (p >= 90) return 'tra i migliori';
  if (p >= 60) return 'sopra la media';
  if (p >= 40) return 'nella media';
  return 'sotto la media';
}

/** The player's last test against the latest test of the other players in the same category. */
export const GroupComparisonCard: React.FC<{ comparison: GroupComparison | null; print?: boolean }> = ({ comparison: c, print }) => {
  if (!c) return null;
  const cat = CATEGORY_TARGETS[c.category].label;
  return (
    <Card title={`Confronto con il gruppo ${cat}`} subtitle={`Ultimo test rispetto a ${c.groupSize} giocatori della stessa categoria`}
      className={print ? 'break-inside-avoid' : ''}>
      {c.overall && (
        <p className="text-sm text-gray-700 mb-3">
          Complessivo: meglio del <strong>{Math.round(c.overall.percentile)}%</strong> del gruppo
          ({c.overall.value.toFixed(0)}% contro una media di {c.overall.groupMean.toFixed(0)}%).
        </p>
      )}
      <div className="space-y-2">
        {c.strokes.map(s => (
          <div key={s.stroke} className="flex items-center gap-3">
            <span className="w-24 text-sm text-gray-700 flex-shrink-0">{s.label}</span>
            <div className="flex-1 h-2.5 rounded-full bg-gray-100 relative overflow-hidden">
              <div className={`h-full rounded-full ${s.percentile >= 60 ? 'bg-ok-500' : s.percentile >= 40 ? 'bg-neutral-400' : 'bg-brand-600'}`}
                style={{ width: `${Math.max(4, s.percentile)}%` }} />
            </div>
            <span className="w-28 text-right text-xs text-gray-600 flex-shrink-0">
              <strong className="text-gray-900">{s.value.toFixed(1)}</strong> · {phrase(s.percentile)}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-3">La barra indica la quota del gruppo che il giocatore supera in quel colpo (media gruppo come riferimento).</p>
    </Card>
  );
};
