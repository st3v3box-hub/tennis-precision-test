import { CourtLines } from '../components/brand/CourtLines';
import { CATEGORY_TARGETS } from '../lib/protocol';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { HistoryList } from '../components/history/HistoryList';
import { ClubFilter, useClubFilter } from '../components/ui/ClubFilter';
import { useAppData } from '../contexts/AppDataContext';
import { logout, getCredentials, ROLE_LABELS } from '../lib/auth';
import type { UserRole } from '../lib/auth';

const ROLE_BADGE: Record<UserRole, { label: string; cls: string }> = {
  admin: { label: 'Amministratore', cls: 'bg-white/10 text-chalk ring-1 ring-white/20' },
  coach: { label: 'Maestro', cls: 'bg-white/10 text-chalk ring-1 ring-white/20' },
  viewer: { label: 'Genitore / allievo', cls: 'bg-white/10 text-chalk ring-1 ring-white/20' },
};

interface Props {
  role: UserRole;
  onLogout: () => void;
}

export const HomePage: React.FC<Props> = ({ role, onLogout }) => {
  const navigate = useNavigate();
  const { sessions, settings, players } = useAppData();

  const handleLogout = () => {
    logout();
    onLogout();
  };

  const [view, setView] = useState<'home' | 'history'>('home');
  const { club, clubs, setClub, matchesPlayer } = useClubFilter(players);
  const badge = ROLE_BADGE[role];

  if (view === 'history') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 shadow-sm flex items-center gap-3">
          <button onClick={() => setView('home')} className="text-gray-500 hover:text-gray-700 text-xl">←</button>
          <h1 className="text-lg font-bold text-gray-900">Storico Sessioni</h1>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <ClubFilter club={club} clubs={clubs} onChange={setClub} />
          <HistoryList sessions={sessions.filter(s => matchesPlayer(s.playerId))} settings={settings} />
        </div>
      </div>
    );
  }

  const recentSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  return (
    <div className="min-h-screen bg-paper">
      {/* Hero: court from above, emblem, title */}
      <div className="court-surface relative overflow-hidden text-white">
        <CourtLines className="absolute -right-24 -top-10 h-[150%] w-auto opacity-[0.13] rotate-[8deg] pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-5 pt-8 pb-7">
          <div className="flex items-start justify-between gap-4">
            <img src="./logo.png" alt="Gladiators Training" className="h-[88px] w-[88px] drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]" />
            <button
              onClick={handleLogout}
              className="text-chalk/80 hover:text-white text-xs font-medium flex items-center gap-1.5 rounded-full px-3 py-1.5 ring-1 ring-white/20"
              title="Esci"
            >
              {getCredentials()?.username ?? ''} · Esci
            </button>
          </div>
          <p className="mt-5 text-chalk/70 text-sm">Gladiators Training Academy</p>
          <h1 className="font-display font-extrabold text-[2.4rem] leading-[0.95] mt-1">Tennis Precision Test</h1>
          <span className={`inline-block mt-3 text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {(role === 'admin' || role === 'coach') && (
          <>
            <button
              onClick={() => navigate('/new')}
              className="w-full -mt-10 relative rounded-2xl bg-brand-600 hover:bg-brand-700 text-white px-5 py-4 text-left shadow-[0_12px_30px_-12px_rgba(11,58,33,0.7)] flex items-center justify-between gap-4"
            >
              <span>
                <span className="block font-display font-extrabold text-2xl leading-none">Nuovo test</span>
                <span className="block text-sm text-brand-100 mt-1">Precisione: groundstrokes, dritto, rovescio, volée, servizio…</span>
              </span>
              <span className="text-3xl leading-none" aria-hidden>+</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <HomeTile title="Killer" text="100 palle di fila" onClick={() => navigate('/killer')} />
              <HomeTile title="Match Test" text="Contro il campo" onClick={() => navigate('/match')} />
              <HomeTile title="Sfide" text="1 vs 1, 2 vs 2, tutti" onClick={() => navigate('/challenge')} />
              <HomeTile title="Giocatori" text="Schede e progressi" onClick={() => navigate('/players')} />
              <HomeTile title="Classifiche" text="Per categoria" onClick={() => navigate('/ranking')} />
              <HomeTile title="Storico" text="Tutti i test" onClick={() => setView('history')} />
              <HomeTile title="Istruzioni" text="Protocollo e zone" onClick={() => navigate('/instructions')} wide={role !== 'admin'} />
              {role === 'admin' && (
                <HomeTile title="Impostazioni" text="Zone, obiettivi, account" onClick={() => navigate('/settings')} />
              )}
            </div>
          </>
        )}

        {role === 'viewer' && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-sm text-blue-700">
              Benvenuto, <strong>{getCredentials()?.username ?? ''}</strong>. Qui puoi visualizzare risultati e classifiche.
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <HomeTile title="Classifiche" text="Per categoria" onClick={() => navigate('/ranking')} />
              <HomeTile title="Giocatori" text="Schede e progressi" onClick={() => navigate('/players')} />
              <HomeTile title="Storico" text="Tutti i test" onClick={() => setView('history')} />
              <HomeTile title="Killer" text="Consistenza" onClick={() => navigate('/killer')} />
              <HomeTile title="Match Test" text="Contro il campo" onClick={() => navigate('/match')} wide />
            </div>
          </>
        )}

        {recentSessions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-xl text-ink">Ultimi test</h2>
              <button onClick={() => setView('history')} className="text-sm text-brand-700 font-semibold">
                Vedi tutti
              </button>
            </div>
            <div className="space-y-2">
              {recentSessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/results/${s.id}`)}
                  className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-brand-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-900">{s.playerName}</span>
                      <span className="text-gray-400 text-xs ml-2">{s.date}</span>
                    </div>
                    <span className="text-xs bg-chalk text-brand-800 px-2 py-0.5 rounded-full font-semibold">
                      {CATEGORY_TARGETS[s.category].label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Coach: {s.coach}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {recentSessions.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <p className="text-sm">
              {role === 'viewer' ? 'Nessun test disponibile.' : 'Nessun test ancora: inizia da "Nuovo test".'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const HomeTile: React.FC<{ title: string; text: string; onClick: () => void; wide?: boolean }> = ({ title, text, onClick, wide }) => (
  <button
    onClick={onClick}
    className={`bg-white rounded-2xl border border-black/[0.06] px-4 py-3.5 text-left hover:border-brand-300 active:bg-chalk transition-colors ${wide ? 'col-span-2' : ''}`}
  >
    <span className="block font-display font-bold text-lg leading-tight text-ink">{title}</span>
    <span className="block text-xs text-gray-500 mt-0.5">{text}</span>
  </button>
);
