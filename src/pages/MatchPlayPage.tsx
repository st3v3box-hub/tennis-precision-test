import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppData } from '../contexts/AppDataContext';
import type { Category, MatchSession, MatchStationId, MatchTargetMode } from '../types';
import { CATEGORY_OPTIONS } from '../lib/protocol';
import { uid } from '../lib/storage';
import {
  DEFAULT_STATIONS, MATCH_STATIONS, balancedCourtTarget, distributionOf, minutesLabel, playerHistory,
  raceOdds, raceState, stationForSeries, type PlayerHistory,
} from '../lib/match';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

// ─── Draft on the phone (survives screen lock, reload, closed tab) ───────────

const DRAFT_KEY = 'tpt_match_live_v1';

function readDraft(): MatchSession | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as MatchSession;
    return d && Array.isArray(d.series) && Array.isArray(d.stations) ? d : null;
  } catch {
    return null;
  }
}
function writeDraft(d: MatchSession | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY);
  } catch { /* storage blocked: the match still works in memory */ }
}

const buzz = (ms: number | number[]) => { try { navigator.vibrate?.(ms); } catch { /* unsupported */ } };

function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const l = await (navigator as any).wakeLock.request('screen');
        if (cancelled) l.release(); else lock = l;
      } catch { /* not allowed: ignore */ }
    };
    request();
    const onVisible = () => { if (document.visibilityState === 'visible') request(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => undefined);
    };
  }, [active]);
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

// ─── Page ────────────────────────────────────────────────────────────────────

export const MatchPlayPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const nav = (location.state ?? {}) as { profileId?: string; resumeId?: string };
  const { players, sessions, matchSessions, settings, lastCoach, saveLastCoach, upsertPlayer, upsertMatch } = useAppData();

  const [draft, setDraftState] = useState<MatchSession | null>(() => {
    // Resuming a suspended match from the list takes precedence over a local draft
    if (nav.resumeId) {
      const m = matchSessions.find(x => x.id === nav.resumeId && x.result === 'in_corso');
      if (m) { writeDraft(m); return m; }
    }
    return readDraft();
  });
  const [resumeAsked, setResumeAsked] = useState(() => !nav.resumeId && readDraft() !== null);
  const setDraft = (d: MatchSession | null) => { setDraftState(d); writeDraft(d); };

  /** The player profile must exist before the match is stored. */
  const ensurePlayer = async (m: MatchSession): Promise<MatchSession> => {
    if (players.some(p => p.id === m.playerId)) return m;
    const now = new Date().toISOString();
    const parts = m.playerName.trim().split(/\s+/);
    await upsertPlayer({
      id: m.playerId, firstName: parts[0] ?? m.playerName, lastName: parts.slice(1).join(' '),
      dateOfBirth: '', autoCreated: true, createdAt: now, updatedAt: now,
    });
    return m;
  };

  const store = async (m: MatchSession) => {
    const saved = { ...(await ensurePlayer(m)), updatedAt: new Date().toISOString() };
    await saveLastCoach(saved.coach);
    await upsertMatch(saved); // queued on the device if offline
    setDraft(null);
    return saved;
  };

  if (draft && !resumeAsked) {
    return (
      <LiveMatch
        match={draft}
        onChange={setDraft}
        onSave={async m => { const s = await store(m); navigate(`/match/${s.id}`, { replace: true }); }}
        onSuspend={async m => { await store({ ...m, result: 'in_corso' }); navigate('/match', { replace: true }); }}
      />
    );
  }

  if (draft && resumeAsked) {
    const r = raceState(draft.series, draft.playerTarget, draft.courtTarget);
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader title="Match Test" backTo="/match" />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Card title="C'è un match in corso">
            <p className="text-sm text-gray-600 mb-4">
              <strong>{draft.playerName}</strong> · {r.balls}/{draft.playerTarget} palle · campo {r.court}/{draft.courtTarget} · {draft.series.length} serie
            </p>
            <div className="flex gap-3">
              <Button className="flex-1 justify-center" onClick={() => setResumeAsked(false)}>Riprendi</Button>
              <Button variant="danger" className="flex-1 justify-center" onClick={() => {
                if (window.confirm('Eliminare il match in corso? Le serie non salvate andranno perse.')) {
                  setDraft(null); setResumeAsked(false);
                }
              }}>Elimina</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <SetupForm
      initialProfileId={nav.profileId}
      coach={lastCoach}
      categoryHint={profileId => {
        const all = [
          ...sessions.filter(s => s.playerId === profileId).map(s => ({ d: s.date, c: s.category })),
          ...matchSessions.filter(m => m.playerId === profileId).map(m => ({ d: m.date, c: m.category })),
        ].sort((a, b) => b.d.localeCompare(a.d));
        return all[0]?.c;
      }}
      history={(profileId, stations) => (profileId ? playerHistory(profileId, stations, sessions, matchSessions) : null)}
      playerTarget={settings.matchPlayerTarget}
      categoryTargets={settings.matchCourtTargets}
      onStart={m => { setDraft(m); setResumeAsked(false); }}
    />
  );
};

// ─── Setup ───────────────────────────────────────────────────────────────────

interface SetupProps {
  initialProfileId?: string;
  coach: string;
  categoryHint: (profileId: string) => Category | undefined;
  history: (profileId: string | undefined, stations: MatchStationId[]) => PlayerHistory | null;
  playerTarget: number;
  categoryTargets: Record<Category, number>;
  onStart: (m: MatchSession) => void;
}

const SetupForm: React.FC<SetupProps> = ({ initialProfileId, coach: coachDefault, categoryHint, history, playerTarget, categoryTargets, onStart }) => {
  const { players } = useAppData();
  const initialProfile = initialProfileId ? players.find(p => p.id === initialProfileId) : undefined;
  const [query, setQuery] = useState(initialProfile ? `${initialProfile.firstName} ${initialProfile.lastName}`.trim() : '');
  const [profileId, setProfileId] = useState<string | undefined>(initialProfile?.id);
  const [category, setCategory] = useState<Category>((initialProfile && categoryHint(initialProfile.id)) || 'seconda');
  const [coach, setCoach] = useState(coachDefault);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [stations, setStations] = useState<MatchStationId[]>(DEFAULT_STATIONS);
  const [mode, setMode] = useState<MatchTargetMode>('categoria');
  const [manual, setManual] = useState(categoryTargets.seconda);
  const [note, setNote] = useState('');

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || profileId) return [];
    return players
      .filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || `${p.lastName} ${p.firstName}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, players, profileId]);

  const hist = useMemo(() => history(profileId, stations), [history, profileId, stations]);
  const dist = useMemo(() => (hist ? distributionOf(hist.scores) : null), [hist]);
  const balanced = useMemo(() => (dist ? balancedCourtTarget(dist, playerTarget) : null), [dist, playerTarget]);

  // History mode needs history: fall back to the category target and say so
  const courtTarget = mode === 'manuale' ? manual : mode === 'storico' && balanced !== null ? balanced : categoryTargets[category];
  const odds = useMemo(() => (dist ? raceOdds(dist, playerTarget, courtTarget) : null), [dist, playerTarget, courtTarget]);

  const toggleStation = (id: MatchStationId) =>
    setStations(prev => (prev.includes(id) ? (prev.length > 1 ? prev.filter(s => s !== id) : prev) : [...prev, id]));

  const input = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
  const canStart = query.trim().length > 0 && courtTarget >= 1;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <PageHeader title="Nuovo Match Test" subtitle={`${playerTarget} palle contro il campo`} backTo="/match" />
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <Card title="Giocatore">
          <div className="space-y-3">
            <div>
              <input value={query} onChange={e => { setQuery(e.target.value); setProfileId(undefined); }}
                placeholder="Cerca in anagrafica o scrivi nome e cognome" className={input} autoComplete="off" />
              {profileId && <p className="text-xs text-ok-600 font-semibold mt-1">✓ Profilo collegato</p>}
              {!profileId && query.trim() && suggestions.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">Nuovo giocatore: verrà creato un profilo al salvataggio.</p>
              )}
              {suggestions.length > 0 && (
                <div className="mt-1 border border-gray-200 rounded-xl bg-white shadow-sm divide-y divide-gray-100 overflow-hidden">
                  {suggestions.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => {
                        setProfileId(p.id);
                        setQuery(`${p.firstName} ${p.lastName}`.trim());
                        const c = categoryHint(p.id);
                        if (c) setCategory(c);
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-50">
                      <span className="font-semibold">{p.firstName} {p.lastName}</span>
                      {p.club && <span className="text-gray-400 text-xs ml-2">{p.club}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORY_OPTIONS.map(o => (
                <button key={o.value} type="button" onClick={() => setCategory(o.value)}
                  className={`py-2 rounded-xl border-2 text-xs font-semibold ${category === o.value ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}>
                  {o.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={coach} onChange={e => setCoach(e.target.value)} placeholder="Maestro" className={input} />
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={input} />
            </div>
          </div>
        </Card>

        <Card title="Colpi" subtitle="Le serie girano sui colpi scelti, uno dopo l'altro. Zone della categoria.">
          <div className="grid grid-cols-2 gap-2">
            {MATCH_STATIONS.map(st => {
              const on = stations.includes(st.id);
              const order = stations.indexOf(st.id);
              return (
                <button key={st.id} type="button" onClick={() => toggleStation(st.id)} aria-pressed={on}
                  className={`relative text-left px-3 py-2.5 rounded-xl border-2 text-sm ${on ? 'border-brand-600 bg-brand-50 font-semibold text-brand-900' : 'border-gray-200 bg-white text-gray-700'}`}>
                  {st.label}
                  {on && stations.length > 1 && (
                    <span className="absolute top-1.5 right-2 text-[10px] font-bold text-brand-600">{order + 1}°</span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Il campo vince a…" subtitle="Ogni serie non perfetta è un punto per il campo. È l'handicap del match.">
          <div className="grid grid-cols-3 gap-1 bg-gray-100 rounded-xl p-1">
            {([
              ['categoria', 'Categoria'],
              ['storico', 'Suo storico'],
              ['manuale', 'Scelgo io'],
            ] as [MatchTargetMode, string][]).map(([m, l]) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`py-2 rounded-lg text-sm font-semibold ${mode === m ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                {l}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-5 mt-4">
            {mode === 'manuale' && (
              <button type="button" onClick={() => setManual(v => Math.max(1, v - 1))}
                className="w-12 h-12 rounded-full border-2 border-gray-300 text-2xl font-bold" aria-label="Meno">−</button>
            )}
            <div className="text-center">
              <p className="text-6xl font-display font-extrabold leading-none tabular-nums">{courtTarget}</p>
              <p className="text-xs text-gray-500 mt-1">punti al campo</p>
            </div>
            {mode === 'manuale' && (
              <button type="button" onClick={() => setManual(v => Math.min(100, v + 1))}
                className="w-12 h-12 rounded-full border-2 border-gray-300 text-2xl font-bold" aria-label="Più">+</button>
            )}
          </div>

          <div className="mt-4 text-sm text-gray-600 space-y-1">
            {mode === 'categoria' && <p>Valore della categoria, si cambia nelle Impostazioni.</p>}
            {mode === 'storico' && balanced === null && (
              <p className="text-amber-700">Non ci sono abbastanza serie nello storico di questo giocatore (ne servono 8): uso il valore della categoria.</p>
            )}
            {mode === 'storico' && balanced !== null && (
              <p>Calcolato perché il match sia il più possibile alla pari, su {hist!.scores.length} serie recenti
                {hist!.sameStrokes ? ' degli stessi colpi' : ' (tutti i colpi: pochi dati sui colpi scelti)'}.</p>
            )}
            {odds && hist ? (
              <p>
                Probabilità stimata di vittoria: <strong className="text-ink">{pct(odds.win)}</strong> · durata circa{' '}
                <strong className="text-ink">{Math.round(odds.expectedSeries)} serie</strong> ({minutesLabel(odds.expectedSeries)})
              </p>
            ) : (
              <p className="text-gray-500">{profileId ? 'Storico insufficiente per stimare le probabilità.' : 'Collega un giocatore in anagrafica per vedere le probabilità.'}</p>
            )}
          </div>
        </Card>

        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
          placeholder="Note (facoltative)" className={`${input} resize-none bg-white`} />

        <Button size="lg" className="w-full justify-center text-base" disabled={!canStart}
          onClick={() => {
            const now = new Date().toISOString();
            onStart({
              id: uid(),
              playerId: profileId ?? uid(),
              playerName: query.trim(),
              date, category, coach: coach.trim(),
              ...(note.trim() ? { note: note.trim() } : {}),
              playerTarget,
              courtTarget,
              targetMode: mode === 'storico' && balanced === null ? 'categoria' : mode,
              ...(odds && hist ? { expectedWin: Math.round(odds.win * 1000) / 1000 } : {}),
              stations,
              series: [],
              result: 'in_corso',
              createdAt: now,
              updatedAt: now,
            });
          }}>
          ▶ Inizia il match
        </Button>
      </div>
    </div>
  );
};

// ─── Live match (on court) ───────────────────────────────────────────────────

interface LiveProps {
  match: MatchSession;
  onChange: (m: MatchSession) => void;
  onSave: (m: MatchSession) => Promise<void>;
  onSuspend: (m: MatchSession) => Promise<void>;
}

const LiveMatch: React.FC<LiveProps> = ({ match, onChange, onSave, onSuspend }) => {
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ score: number; n: number } | null>(null);
  const [menu, setMenu] = useState(false);
  const race = raceState(match.series, match.playerTarget, match.courtTarget);
  const over = race.result === 'vinto' || race.result === 'perso';
  const next = stationForSeries(match.stations, match.series.length);
  const multi = match.stations.length > 1;

  useWakeLock(!over);

  const add = (score: number) => {
    if (over || busy) return;
    const series = [...match.series, { station: next.id, testType: next.testType, direction: next.direction, score }];
    const r = raceState(series, match.playerTarget, match.courtTarget);
    buzz(r.result === 'vinto' ? [80, 60, 80, 60, 200] : r.result === 'perso' ? [200, 80, 200] : score === 10 ? 25 : 60);
    setLast({ score, n: series.length });
    onChange({ ...match, series, result: r.result === 'in_corso' ? 'in_corso' : r.result });
  };

  const undo = () => {
    if (match.series.length === 0 || busy) return;
    const series = match.series.slice(0, -1);
    setLast(null);
    onChange({ ...match, series, result: 'in_corso' });
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (err) {
      console.error(err);
      alert('Salvataggio non riuscito. Il match resta sul telefono: riprova.');
      setBusy(false);
    }
  };

  const playerMatchPoint = !over && race.ballsLeft <= 10;
  const courtMatchPoint = !over && race.courtLeft === 1;

  return (
    <div className="min-h-screen bg-pitch-deep text-white flex flex-col select-none">
      {/* Top bar */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-3 border-b border-white/10">
        <img src="./logo.png" alt="" className="h-8 w-8" />
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{match.playerName}</p>
          <p className="text-[11px] text-chalk/60 truncate">Match Test · serie {match.series.length + (over ? 0 : 1)}</p>
        </div>
        <button type="button" onClick={() => setMenu(true)} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-semibold">Pausa / Stop</button>
      </div>

      {/* Scoreboard */}
      <div className="px-4 pt-4 space-y-2">
        <ScoreRow name="Giocatore" value={race.balls} target={match.playerTarget} unit="palle"
          tone="player" highlight={playerMatchPoint} />
        <ScoreRow name="Campo" value={race.court} target={match.courtTarget} unit="punti"
          tone="court" highlight={courtMatchPoint} />
      </div>

      {!over && (
        <>
          <div className="px-4 mt-4 min-h-[3.5rem]">
            {playerMatchPoint && (
              <p className="text-center rounded-xl bg-ball text-ball-ink font-display font-extrabold py-2">
                Match point · mancano {race.ballsLeft} palle
              </p>
            )}
            {courtMatchPoint && !playerMatchPoint && (
              <p className="text-center rounded-xl bg-red-600 font-display font-extrabold py-2">
                Match point per il campo · serve 10 su 10
              </p>
            )}
            {!playerMatchPoint && !courtMatchPoint && last && (
              <p className="text-center text-sm text-chalk/70 py-2">
                Serie {last.n}: {last.score}/10 · {last.score === 10 ? 'nessun punto al campo' : 'punto al campo'}
              </p>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-end px-4 pb-4 gap-3">
            <p className="text-center">
              <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold ${multi ? 'bg-white text-black' : 'bg-white/10 text-chalk'}`}>
                Serie {match.series.length + 1} · {next.label}
              </span>
            </p>
            <p className="text-center text-xs text-chalk/60">Palle nella zona su 10</p>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <button key={n} type="button" onClick={() => add(n)}
                  className="py-4 rounded-xl bg-white/10 active:bg-white/25 text-2xl font-display font-extrabold tabular-nums">
                  {n}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => add(10)}
              className="w-full py-5 rounded-2xl bg-ball text-ball-ink active:brightness-90 text-3xl font-display font-extrabold">
              10 · perfetta
            </button>
            <button type="button" onClick={undo} disabled={match.series.length === 0}
              className="py-3 rounded-xl bg-white/10 text-sm disabled:opacity-30">↶ Annulla ultima serie</button>
          </div>
        </>
      )}

      {over && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className={`font-display font-extrabold text-6xl ${race.result === 'vinto' ? 'text-ball' : 'text-red-400'}`}>
            {race.result === 'vinto' ? 'Vinto' : 'Perso'}
          </p>
          <p className="text-chalk/70 mt-2">
            {race.result === 'vinto'
              ? `${race.balls} palle in ${race.played} serie, il campo si è fermato a ${race.court}.`
              : `Il campo arriva a ${match.courtTarget}: ${race.balls} palle su ${match.playerTarget}.`}
          </p>
          <Button size="lg" className="mt-8 w-full max-w-sm justify-center text-base" disabled={busy}
            onClick={() => run(() => onSave(match))}>
            {busy ? 'Salvataggio…' : 'Salva e vedi il resoconto'}
          </Button>
          <button type="button" onClick={undo} disabled={busy} className="mt-4 text-sm text-chalk/60 underline">
            Ho sbagliato: correggi l'ultima serie
          </button>
        </div>
      )}

      {menu && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-end" onClick={() => !busy && setMenu(false)}>
          <div className="w-full bg-white text-black rounded-t-3xl p-5 pb-8 space-y-3" onClick={e => e.stopPropagation()}>
            <p className="font-display font-bold text-xl">Fermare il match?</p>
            <button type="button" disabled={busy}
              onClick={() => run(() => onSuspend(match))}
              className="w-full text-left px-4 py-3 rounded-2xl border-2 border-gray-200">
              <span className="block font-bold">Sospendi e riprendi dopo</span>
              <span className="block text-sm text-gray-500">Pioggia, buio, pausa: il punteggio resta salvato e si riparte da qui.</span>
            </button>
            <button type="button" disabled={busy || match.series.length === 0}
              onClick={() => run(() => onSave({ ...match, result: 'interrotto' }))}
              className="w-full text-left px-4 py-3 rounded-2xl border-2 border-gray-200 disabled:opacity-40">
              <span className="block font-bold">Chiudi qui come interrotto</span>
              <span className="block text-sm text-gray-500">Il match finisce senza vincitore, le serie giocate restano.</span>
            </button>
            <button type="button" onClick={() => setMenu(false)} disabled={busy} className="w-full py-3 rounded-2xl bg-gray-100 font-bold">
              Continua a giocare
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ScoreRow: React.FC<{
  name: string; value: number; target: number; unit: string; tone: 'player' | 'court'; highlight: boolean;
}> = ({ name, value, target, unit, tone, highlight }) => {
  const fill = Math.min(100, (value / target) * 100);
  const bar = tone === 'player' ? 'bg-ball' : 'bg-red-500';
  return (
    <div className={`rounded-2xl px-4 py-3 ${highlight ? (tone === 'player' ? 'ring-2 ring-ball bg-white/10' : 'ring-2 ring-red-500 bg-white/10') : 'bg-white/5'}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-chalk/80">{name}</span>
        <span className="tabular-nums">
          <span className="font-display font-extrabold text-5xl leading-none">{value}</span>
          <span className="text-chalk/50 text-lg font-semibold"> / {target} {unit}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/10 mt-2 overflow-hidden">
        <div className={`h-full ${bar} transition-all`} style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
};
