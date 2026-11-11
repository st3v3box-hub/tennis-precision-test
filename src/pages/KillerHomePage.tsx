import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../contexts/AppDataContext';
import { can } from '../lib/auth';
import { CATEGORY_OPTIONS, CATEGORY_TARGETS } from '../lib/protocol';
import { computeKillerStats } from '../lib/killer';
import type { Category } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { ClubFilter, useClubFilter } from '../components/ui/ClubFilter';
import { killerIndexColor } from './KillerResultsPage';

type Tab = 'storico' | 'classifica';

export const KillerHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { killerSessions, players, settings } = useAppData();
  const { club, clubs, setClub, matchesPlayer } = useClubFilter(players);
  const [tab, setTab] = useState<Tab>('storico');
  const [category, setCategory] = useState<Category | ''>('');

  const targets = useMemo(() => {
    const set = new Set(killerSessions.map(k => k.target));
    set.add(settings.killerTarget);
    return [...set].sort((a, b) => a - b);
  }, [killerSessions, settings.killerTarget]);
  const [targetSel, setTargetSel] = useState<number | null>(null);
  const target = targetSel ?? settings.killerTarget;

  const withStats = useMemo(
    () => killerSessions
      .filter(k => matchesPlayer(k.playerId) && (!category || k.category === category))
      .map(k => ({ k, s: computeKillerStats(k) }))
      .sort((a, b) => (b.k.date + b.k.createdAt).localeCompare(a.k.date + a.k.createdAt)),
    [killerSessions, matchesPlayer, category]
  );

  // Ranking: best completed index per player for the selected target
  const ranking = useMemo(() => {
    const best = new Map<string, (typeof withStats)[number]>();
    for (const row of withStats) {
      if (row.k.target !== target || row.s.index === null) continue;
      const cur = best.get(row.k.playerId);
      if (!cur || (cur.s.index ?? 0) < row.s.index) best.set(row.k.playerId, row);
    }
    return [...best.values()].sort((a, b) => (b.s.index ?? 0) - (a.s.index ?? 0));
  }, [withStats, target]);

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-semibold border ${active ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <PageHeader title="Killer" subtitle="Consistenza · pazienza · concentrazione" backTo="/" />
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {can('createTest') && (
          <Button size="lg" className="w-full justify-center text-base" onClick={() => navigate('/killer/new')} icon="▶">
            Nuovo test Killer
          </Button>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-3 space-y-3">
          <div className="grid grid-cols-2 gap-1 bg-gray-100 rounded-xl p-1">
            {(['storico', 'classifica'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`py-2 rounded-lg text-sm font-semibold ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                {t === 'storico' ? 'Storico' : 'Classifica'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={chip(category === '')} onClick={() => setCategory('')}>Tutte</button>
            {CATEGORY_OPTIONS.map(o => (
              <button key={o.value} className={chip(category === o.value)} onClick={() => setCategory(o.value)}>{o.label}</button>
            ))}
          </div>
          {tab === 'classifica' && targets.length > 1 && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Obiettivo</span>
              <select value={target} onChange={e => setTargetSel(Number(e.target.value))}
                className="border border-gray-300 rounded-xl px-3 py-2 bg-white text-sm">
                {targets.map(t => <option key={t} value={t}>{t} palle</option>)}
              </select>
            </label>
          )}
          <ClubFilter club={club} clubs={clubs} onChange={setClub} />
        </div>

        {tab === 'storico' && (
          withStats.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {withStats.map(({ k, s }) => (
                <button key={k.id} onClick={() => navigate(`/killer/${k.id}`)}
                  className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-brand-300 hover:shadow-sm transition-all flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{k.playerName}</p>
                    <p className="text-xs text-gray-500">
                      {k.date} · {CATEGORY_TARGETS[k.category].label} · obiettivo {k.target}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {s.completed ? `${s.errors} ${s.errors === 1 ? 'errore' : 'errori'} · ${s.totalBalls} palle` : `interrotto · miglior serie ${s.bestStreak}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-black tabular-nums ${killerIndexColor(s.index)}`}>{s.index !== null ? Math.round(s.index) : '—'}</p>
                    <p className="text-[11px] text-gray-500">{s.rating}</p>
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {tab === 'classifica' && (
          ranking.length === 0 ? <Empty text={`Nessun test Killer completato con obiettivo ${target}.`} /> : (
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {ranking.map(({ k, s }, i) => (
                <button key={k.id} onClick={() => navigate(`/killer/${k.id}`)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
                  <span className="w-7 text-center font-black text-gray-400">{i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{k.playerName}</p>
                    <p className="text-xs text-gray-500">{k.date} · {s.errors} {s.errors === 1 ? 'errore' : 'errori'} · {CATEGORY_TARGETS[k.category].label}</p>
                  </div>
                  <span className={`text-xl font-black tabular-nums ${killerIndexColor(s.index)}`}>{Math.round(s.index ?? 0)}</span>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

const Empty: React.FC<{ text?: string }> = ({ text }) => (
  <div className="text-center py-10 text-gray-400">
    <div className="text-4xl mb-2">🎯</div>
    <p className="text-sm">{text ?? 'Nessun test Killer ancora.'}</p>
  </div>
);
