import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { MatchSession } from '../../types';
import { RESULT_LABEL, raceState } from '../../lib/match';
import { Card } from '../ui/Card';

/** Match Test record of one player: wins, losses, last matches. */
export const MatchSummaryCard: React.FC<{ matches: MatchSession[]; onNew?: () => void }> = ({ matches, onNew }) => {
  const navigate = useNavigate();
  const played = matches
    .filter(m => m.result !== 'in_corso')
    .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));

  if (played.length === 0) {
    return onNew ? (
      <Card title="Match Test">
        <p className="text-sm text-gray-500 mb-3">Nessun match: il giocatore contro il campo, sotto pressione.</p>
        <button onClick={onNew} className="w-full py-2.5 rounded-xl border-2 border-brand-300 bg-brand-50 text-sm font-bold text-brand-700">Gioca un match</button>
      </Card>
    ) : null;
  }

  const won = played.filter(m => m.result === 'vinto').length;
  const lost = played.filter(m => m.result === 'perso').length;

  return (
    <Card title="Match Test" subtitle="Il giocatore contro il campo"
      actions={onNew ? <button onClick={onNew} className="text-xs font-bold text-brand-600">+ Nuovo</button> : undefined}>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-pitch text-white py-2.5">
          <p className="text-[11px] text-chalk/70">Vinti</p>
          <p className="text-2xl font-display font-extrabold">{won}</p>
        </div>
        <div className="rounded-xl bg-gray-50 py-2.5">
          <p className="text-[11px] text-gray-500">Persi</p>
          <p className="text-2xl font-display font-extrabold">{lost}</p>
        </div>
      </div>
      <ul className="mt-3 divide-y divide-gray-100">
        {played.slice(0, 5).map(m => {
          const r = raceState(m.series, m.playerTarget, m.courtTarget, m.result === 'interrotto');
          return (
            <li key={m.id}>
              <button onClick={() => navigate(`/match/${m.id}`)} className="w-full py-2 flex items-center justify-between text-sm">
                <span className="text-gray-600">{m.date}</span>
                <span className="tabular-nums">{r.balls}/{m.playerTarget} – {r.court}/{m.courtTarget}</span>
                <span className={`font-semibold ${m.result === 'vinto' ? 'text-ok-600' : m.result === 'perso' ? 'text-red-600' : 'text-gray-500'}`}>{RESULT_LABEL[m.result]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};
