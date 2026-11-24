import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../contexts/AppDataContext';
import { can } from '../lib/auth';
import { CATEGORY_OPTIONS, CATEGORY_TARGETS } from '../lib/protocol';
import { RESULT_LABEL, raceState } from '../lib/match';
import type { Category, MatchResult } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { ClubFilter, useClubFilter } from '../components/ui/ClubFilter';

export const resultBadge: Record<MatchResult, string> = {
  vinto: 'bg-ok-100 text-ok-800',
  perso: 'bg-red-100 text-red-800',
  interrotto: 'bg-gray-100 text-gray-700',
  in_corso: 'bg-ball text-ball-ink',
};

export const MatchHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { matchSessions, players, settings } = useAppData();
  const { club, clubs, setClub, matchesPlayer } = useClubFilter(players);
  const [category, setCategory] = useState<Category | ''>('');

  const rows = useMemo(
    () => matchSessions
      .filter(m => matchesPlayer(m.playerId) && (!category || m.category === category))
      .map(m => ({ m, r: raceState(m.series, m.playerTarget, m.courtTarget, m.result === 'interrotto') }))
      .sort((a, b) => (b.m.date + b.m.createdAt).localeCompare(a.m.date + a.m.createdAt)),
    [matchSessions, matchesPlayer, category]
  );
  const suspended = rows.filter(x => x.m.result === 'in_corso');
  const done = rows.filter(x => x.m.result !== 'in_corso');

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-semibold border ${active ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <PageHeader title="Match Test" subtitle="Il giocatore contro il campo" backTo="/" />
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="rounded-2xl bg-pitch text-white px-4 py-4">
          <p className="font-display font-bold text-lg text-ball">Come si gioca</p>
          <p className="text-sm text-chalk/85 mt-1 leading-relaxed">
            Il giocatore deve mettere <strong className="text-white">{settings.matchPlayerTarget} palle</strong> nella zona.
            Ogni serie non perfetta (meno di 10 su 10) è un punto per il campo. Chi arriva prima al traguardo vince.
            Il traguardo del campo è l'handicap: più è basso, più il match è difficile.
          </p>
        </div>

        {can('createTest') && (
          <Button size="lg" className="w-full justify-center text-base" onClick={() => navigate('/match/new')} icon="▶">
            Nuovo match
          </Button>
        )}

        {suspended.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-3">
            <p className="font-display font-bold mb-2">Sospesi</p>
            <ul className="divide-y divide-gray-100">
              {suspended.map(({ m, r }) => (
                <li key={m.id} className="py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{m.playerName}</p>
                    <p className="text-xs text-gray-500">{m.date} · {r.balls}/{m.playerTarget} palle · campo {r.court}/{m.courtTarget}</p>
                  </div>
                  {can('createTest') && (
                    <Button size="sm" onClick={() => navigate('/match/new', { state: { resumeId: m.id } })}>Riprendi</Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button className={chip(category === '')} onClick={() => setCategory('')}>Tutte</button>
            {CATEGORY_OPTIONS.map(o => (
              <button key={o.value} className={chip(category === o.value)} onClick={() => setCategory(o.value)}>{o.label}</button>
            ))}
          </div>
          <ClubFilter club={club} clubs={clubs} onChange={setClub} />

          {done.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">Nessun match giocato.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {done.map(({ m, r }) => (
                <li key={m.id}>
                  <button onClick={() => navigate(`/match/${m.id}`)} className="w-full text-left py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{m.playerName}</p>
                      <p className="text-xs text-gray-500">
                        {m.date} · {CATEGORY_TARGETS[m.category].label} · {r.played} serie
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`inline-block text-[11px] font-bold rounded-full px-2 py-0.5 ${resultBadge[m.result]}`}>{RESULT_LABEL[m.result]}</span>
                      <p className="text-sm font-display font-bold tabular-nums mt-0.5">{r.balls} – {r.court}<span className="text-gray-400 font-normal text-xs"> /{m.courtTarget}</span></p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
