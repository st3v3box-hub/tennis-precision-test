import React, { useState, useMemo } from 'react';
import type { WizardState, WizardPlayerData, Category } from '../../types';
import type { PlayerProfile } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CATEGORY_OPTIONS, CATEGORY_TARGETS } from '../../lib/protocol';
import { getPlayerProfiles } from '../../lib/storage';

interface Props {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
  updatePlayer: (idx: number, patch: Partial<WizardPlayerData>) => void;
  setPlayerCount: (count: 1 | 2 | 3 | 4) => void;
  onNext: () => void;
}

const CategoryDiagram: React.FC<{ cat: Category }> = ({ cat }) => {
  const t = CATEGORY_TARGETS[cat];
  return (
    <div className="mt-3 bg-gray-50 rounded-xl p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{t.label}</p>
      <p className="text-gray-500 text-xs mb-2">{t.description}</p>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-white rounded-lg p-2 border border-gray-200">
          <div className="text-gray-500 mb-1">Groundstroke</div>
          <div className="font-semibold text-green-700">{t.groundstroke}</div>
        </div>
        <div className="bg-white rounded-lg p-2 border border-gray-200">
          <div className="text-gray-500 mb-1">Volley</div>
          <div className="font-semibold text-blue-700">{t.volley}</div>
        </div>
        <div className="bg-white rounded-lg p-2 border border-gray-200">
          <div className="text-gray-500 mb-1">Servizio</div>
          <div className="font-semibold text-orange-700">{t.serve}</div>
        </div>
      </div>
    </div>
  );
};

export const StepMeta: React.FC<Props> = ({ state, update, updatePlayer, setPlayerCount, onNext }) => {
  const [pickerOpenIdx, setPickerOpenIdx] = useState<number | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const profiles = useMemo(() => getPlayerProfiles(), []);

  const canContinue =
    state.players.every(p => p.name.trim().length > 0) &&
    state.date.length > 0 &&
    state.coach.trim().length > 0;

  const linkProfile = (playerIdx: number, profile: PlayerProfile) => {
    updatePlayer(playerIdx, {
      profileId: profile.id,
      name: `${profile.firstName} ${profile.lastName}`.trim(),
      dateOfBirth: profile.dateOfBirth || undefined,
    });
    setPickerOpenIdx(null);
    setPickerSearch('');
  };

  const unlinkProfile = (playerIdx: number) => {
    updatePlayer(playerIdx, { profileId: undefined });
  };

  const canChallenge = state.playerCount >= 2;

  const getCardTitle = (idx: number): string => {
    if (state.challengeMode === '1v1') {
      return idx === 0 ? '🔴 Giocatore A' : '🔵 Giocatore B';
    }
    if (state.challengeMode === '2v2') {
      const labels = ['🔴 Team 1 · P1', '🔴 Team 1 · P2', '🔵 Team 2 · P1', '🔵 Team 2 · P2'];
      return labels[idx] ?? `Giocatore ${idx + 1}`;
    }
    if (state.challengeMode === 'ffa') {
      return `⚔️ Giocatore ${idx + 1}`;
    }
    return state.playerCount > 1 ? `Giocatore ${idx + 1}` : 'Dati Giocatore';
  };

  const filteredProfiles = useMemo(() => {
    const q = pickerSearch.toLowerCase();
    return profiles.filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      (p.club ?? '').toLowerCase().includes(q)
    );
  }, [profiles, pickerSearch]);

  return (
    <div className="space-y-4">
      {/* Player count */}
      <Card title="Numero di Giocatori">
        <p className="text-xs text-gray-500 mb-3">Seleziona quanti giocatori partecipano al test</p>
        <div className="grid grid-cols-4 gap-2">
          {([1, 2, 3, 4] as const).map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setPlayerCount(n)}
              className={`py-3 rounded-xl border-2 text-xl font-bold transition-all
                ${state.playerCount === n
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                }`}
            >
              {n}
            </button>
          ))}
        </div>
      </Card>

      {/* Challenge mode toggle */}
      {canChallenge && (
        <Card title="Modalità">
          <p className="text-xs text-gray-500 mb-3">
            {state.playerCount === 2 && 'Con 2 giocatori puoi attivare la sfida 1 vs 1.'}
            {state.playerCount === 3 && 'Con 3 giocatori puoi giocare tutti contro tutti (round-robin).'}
            {state.playerCount === 4 && 'Con 4 giocatori puoi giocare 2 vs 2 o tutti contro tutti.'}
          </p>
          <div className={`grid gap-2 ${state.playerCount === 4 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <button
              type="button"
              onClick={() => update({ challengeMode: 'none' })}
              className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all
                ${state.challengeMode === 'none'
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                }`}
            >
              Normale
            </button>
            {state.playerCount === 2 && (
              <button
                type="button"
                onClick={() => update({ challengeMode: '1v1' })}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all
                  ${state.challengeMode === '1v1'
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-orange-400'
                  }`}
              >
                🏆 1 vs 1
              </button>
            )}
            {state.playerCount === 3 && (
              <button
                type="button"
                onClick={() => update({ challengeMode: 'ffa' })}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all
                  ${state.challengeMode === 'ffa'
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-orange-400'
                  }`}
              >
                🔄 Tutti vs Tutti
              </button>
            )}
            {state.playerCount === 4 && (
              <>
                <button
                  type="button"
                  onClick={() => update({ challengeMode: '2v2' })}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all
                    ${state.challengeMode === '2v2'
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-orange-400'
                    }`}
                >
                  👥 2 vs 2
                </button>
                <button
                  type="button"
                  onClick={() => update({ challengeMode: 'ffa' })}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all
                    ${state.challengeMode === 'ffa'
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-orange-400'
                    }`}
                >
                  🔄 Tutti vs Tutti
                </button>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Per-player inputs */}
      {state.players.map((p, i) => (
        <Card key={i} title={getCardTitle(i)}>
          <div className="space-y-3">

            {/* Profile linked: show badge + delink */}
            {p.profileId ? (
              <div className="flex items-center justify-between bg-green-50 rounded-xl px-3 py-2.5 border border-green-200">
                <div>
                  <p className="text-xs text-green-600 font-semibold mb-0.5">✓ Profilo collegato</p>
                  <p className="text-sm font-bold text-gray-900">{p.name}</p>
                  {p.dateOfBirth && (
                    <p className="text-xs text-gray-500 mt-0.5">{p.dateOfBirth}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => unlinkProfile(i)}
                  className="text-gray-400 hover:text-red-500 text-lg leading-none px-2 py-1"
                  title="Scollega profilo"
                >
                  ×
                </button>
              </div>
            ) : (
              /* Name input + profile picker */
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={p.name}
                  onChange={e => updatePlayer(i, { name: e.target.value })}
                  placeholder="Es. Mario Rossi"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />

                {/* Profile picker toggle */}
                {profiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPickerOpenIdx(pickerOpenIdx === i ? null : i);
                      setPickerSearch('');
                    }}
                    className="mt-1.5 text-xs text-green-600 hover:text-green-800 font-medium flex items-center gap-1"
                  >
                    🔗 Seleziona da anagrafica ({profiles.length})
                    <span className="text-gray-400">{pickerOpenIdx === i ? '▲' : '▼'}</span>
                  </button>
                )}

                {/* Inline profile picker */}
                {pickerOpenIdx === i && (
                  <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        type="text"
                        value={pickerSearch}
                        onChange={e => setPickerSearch(e.target.value)}
                        placeholder="Cerca per nome o club..."
                        className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredProfiles.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">Nessun profilo trovato</p>
                      ) : (
                        filteredProfiles.map(profile => (
                          <button
                            key={profile.id}
                            type="button"
                            onClick={() => linkProfile(i, profile)}
                            className="w-full text-left px-3 py-2.5 hover:bg-green-50 border-b border-gray-50 last:border-0 transition-colors"
                          >
                            <p className="text-sm font-semibold text-gray-800">
                              {profile.lastName} {profile.firstName}
                              {profile.autoCreated && (
                                <span className="ml-1 text-xs text-amber-500 font-normal">⚠ incompleto</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400">
                              {profile.dateOfBirth && `${profile.dateOfBirth} · `}
                              {profile.club ?? ''}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Category selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria / Livello</label>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updatePlayer(i, { category: opt.value })}
                    className={`py-2 rounded-xl border-2 text-xs font-semibold transition-all
                      ${p.category === opt.value
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {state.playerCount === 1 && <CategoryDiagram cat={p.category} />}
            </div>

            {/* DOB (only for unlinked players) */}
            {!p.profileId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data di Nascita</label>
                <input
                  type="date"
                  value={p.dateOfBirth ?? ''}
                  onChange={e => updatePlayer(i, { dateOfBirth: e.target.value || undefined })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nota <span className="text-gray-400 font-normal">(opzionale)</span>
              </label>
              <textarea
                value={p.note ?? ''}
                onChange={e => updatePlayer(i, { note: e.target.value || undefined })}
                placeholder="Es. stato di forma, osservazioni tecniche..."
                rows={2}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
          </div>
        </Card>
      ))}

      {/* Session info */}
      <Card title="Dati Sessione">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coach *</label>
            <input
              type="text"
              value={state.coach}
              onChange={e => update({ coach: e.target.value })}
              placeholder="Es. Luigi Bianchi"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <input
              type="date"
              value={state.date}
              onChange={e => update({ date: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </Card>

      <Button size="lg" className="w-full" disabled={!canContinue} onClick={onNext}>
        {state.challengeMode === 'ffa'
          ? '🔄 Inizia Tutti vs Tutti →'
          : state.challengeMode !== 'none'
            ? `🏆 Inizia Sfida ${state.challengeMode.toUpperCase()} →`
            : 'Inizia Test →'}
      </Button>
    </div>
  );
};
