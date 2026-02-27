import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlayerProfiles, deletePlayerProfile, getSessions, getSettings } from '../lib/storage';
import { computeSessionResults } from '../lib/formulas';
import { percentToStars, renderStars, STAR_LABELS } from '../lib/stars';
import type { PlayerProfile } from '../types';
import { Button } from '../components/ui/Button';

function calcAge(dob: string, ref = new Date()): number {
  const d = new Date(dob);
  let age = ref.getFullYear() - d.getFullYear();
  if (ref.getMonth() < d.getMonth() || (ref.getMonth() === d.getMonth() && ref.getDate() < d.getDate())) age--;
  return age;
}

export const PlayersPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState(getPlayerProfiles);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const settings = useMemo(() => getSettings(), []);
  const allSessions = useMemo(() => getSessions(), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return profiles
      .filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        (p.club ?? '').toLowerCase().includes(q)
      )
      .sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`));
  }, [profiles, search]);

  const handleDelete = (id: string) => {
    deletePlayerProfile(id);
    setProfiles(getPlayerProfiles());
    setDeleteConfirm(null);
  };

  const getBestPct = (profileId: string) => {
    const sessions = allSessions.filter(s => s.playerId === profileId && s.completed);
    if (sessions.length === 0) return null;
    return Math.max(...sessions.map(s =>
      computeSessionResults(s, settings.stdDevMode, settings.precisionTimeStrategy).percentOfIdeal
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 text-xl">←</button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">Anagrafica Giocatori</h1>
        <span className="text-xs text-gray-400">{profiles.length} giocatori</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Search + New */}
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome o club..."
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <Button onClick={() => navigate('/players/new')} icon="+">Nuovo</Button>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">👤</div>
            <p className="font-medium">
              {profiles.length === 0 ? 'Nessun giocatore registrato' : 'Nessun risultato'}
            </p>
            {profiles.length === 0 && (
              <p className="text-sm mt-1">Aggiungi il primo giocatore con il tasto "Nuovo"</p>
            )}
          </div>
        )}

        <div className="space-y-3">
          {filtered.map(p => {
            const age = calcAge(p.dateOfBirth);
            const best = getBestPct(p.id);
            const stars = best !== null ? percentToStars(best) : null;
            const sessCount = allSessions.filter(s => s.playerId === p.id).length;

            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                  onClick={() => navigate(`/players/${p.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900">
                          {p.lastName} {p.firstName}
                        </h3>
                        {p.autoCreated && (
                          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">
                            ⚠ Da completare
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {age} anni · {p.dateOfBirth}
                        {p.club && ` · ${p.club}`}
                        {p.coachName && ` · Coach: ${p.coachName}`}
                      </p>
                      {p.fitRanking && (
                        <p className="text-xs text-blue-600 mt-0.5">FIT: {p.fitRanking}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {stars !== null ? (
                        <>
                          <div className="text-base leading-none text-yellow-400">{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{STAR_LABELS[stars]}</div>
                          <div className="text-xs text-gray-400">{best!.toFixed(0)}% · {sessCount} test</div>
                        </>
                      ) : (
                        <div className="text-xs text-gray-400">{sessCount === 0 ? 'Nessun test' : `${sessCount} test`}</div>
                      )}
                    </div>
                  </div>
                </button>

                <div className="border-t border-gray-100 px-4 py-2 flex gap-2 justify-end">
                  <button
                    onClick={() => navigate(`/players/${p.id}/edit`)}
                    className="text-xs text-gray-500 hover:text-green-600 font-medium px-2 py-1 rounded"
                  >
                    Modifica
                  </button>
                  {deleteConfirm === p.id ? (
                    <>
                      <button onClick={() => handleDelete(p.id)} className="text-xs text-red-600 font-bold px-2 py-1 rounded">Conferma</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-400 px-2 py-1 rounded">Ann.</button>
                    </>
                  ) : (
                    <button onClick={() => setDeleteConfirm(p.id)} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded">🗑</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
