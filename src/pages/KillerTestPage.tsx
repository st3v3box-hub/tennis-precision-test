import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppData } from '../contexts/AppDataContext';
import type { Category, KillerDepth, KillerSession, KillerZone } from '../types';
import { CATEGORY_OPTIONS } from '../lib/protocol';
import { uid } from '../lib/storage';
import {
  DEPTH_LABELS, ZONE_LABELS, STROKE_LABEL, formatDuration, killerClock, killerReducer,
  startKiller, strokeForBall, type KillerAction, type KillerLiveState,
} from '../lib/killer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

// ─── Draft persistence (survives screen lock, reload, closed tab) ────────────

interface KillerSetup {
  profileId?: string;
  name: string;
  category: Category;
  coach: string;
  date: string;
  target: number;
  zone: KillerZone;
  depth: KillerDepth;
  note: string;
}

interface KillerDraft {
  setup: KillerSetup;
  live: KillerLiveState;
}

const DRAFT_KEY = 'tpt_killer_live_v1';

function readDraft(): KillerDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as KillerDraft;
    return d?.setup && d?.live && Array.isArray(d.live.attempts) ? d : null;
  } catch {
    return null;
  }
}
function writeDraft(d: KillerDraft | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY);
  } catch { /* storage full or blocked: the test still works in memory */ }
}

/** Keeps the phone screen on while the test is running (where supported). */
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
      } catch { /* not allowed (battery saver, iframe…): ignore */ }
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

const buzz = (ms: number | number[]) => { try { navigator.vibrate?.(ms); } catch { /* unsupported */ } };

// ─── Page ────────────────────────────────────────────────────────────────────

export const KillerTestPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { players, sessions, killerSessions, settings, lastCoach, saveLastCoach, upsertPlayer, upsertKiller } = useAppData();

  const quickProfileId = (location.state as { profileId?: string } | null)?.profileId;
  const [draft, setDraft] = useState<KillerDraft | null>(readDraft);
  const [resumeAsked, setResumeAsked] = useState(() => readDraft() !== null);

  const finish = async (d: KillerDraft) => {
    const now = new Date().toISOString();
    const { setup, live } = d;
    let playerId = setup.profileId;
    if (!playerId) {
      playerId = uid();
      const parts = setup.name.trim().split(/\s+/);
      await upsertPlayer({
        id: playerId,
        firstName: parts[0] ?? setup.name.trim(),
        lastName: parts.slice(1).join(' '),
        dateOfBirth: '',
        autoCreated: true,
        createdAt: now,
        updatedAt: now,
      });
    }
    const session: KillerSession = {
      id: uid(),
      playerId,
      playerName: setup.name.trim(),
      date: setup.date,
      category: setup.category,
      coach: setup.coach.trim(),
      target: setup.target,
      zone: setup.zone,
      depth: setup.depth,
      ...(setup.note.trim() ? { note: setup.note.trim() } : {}),
      completed: live.completed,
      attempts: live.attempts,
      createdAt: now,
    };
    await saveLastCoach(setup.coach);
    await upsertKiller(session); // queued on the device if offline
    writeDraft(null);
    setDraft(null);
    navigate(`/killer/${session.id}`, { replace: true });
  };

  if (draft && !resumeAsked) {
    return <LiveTest draft={draft} onDraftChange={d => { setDraft(d); writeDraft(d); }} onFinish={finish} />;
  }

  if (draft && resumeAsked) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader title="Test Killer" backTo="/killer" />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Card title="C'è un test in corso">
            <p className="text-sm text-gray-600 mb-4">
              <strong>{draft.setup.name}</strong> · obiettivo {draft.setup.target} palle ·{' '}
              {draft.live.attempts.length} {draft.live.attempts.length === 1 ? 'partenza conclusa' : 'partenze concluse'}.
            </p>
            <div className="flex gap-3">
              <Button className="flex-1 justify-center" onClick={() => setResumeAsked(false)}>Riprendi</Button>
              <Button variant="danger" className="flex-1 justify-center" onClick={() => {
                if (window.confirm('Eliminare il test in corso? I dati non salvati andranno persi.')) {
                  writeDraft(null); setDraft(null); setResumeAsked(false);
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
      initialProfileId={quickProfileId}
      defaults={{
        target: settings.killerTarget,
        zone: settings.killerZone,
        depth: settings.killerDepth,
        coach: lastCoach,
      }}
      players={players}
      categoryHint={(profileId: string) => {
        const all = [
          ...sessions.filter(s => s.playerId === profileId).map(s => ({ d: s.date, c: s.category })),
          ...killerSessions.filter(k => k.playerId === profileId).map(k => ({ d: k.date, c: k.category })),
        ].sort((a, b) => b.d.localeCompare(a.d));
        return all[0]?.c;
      }}
      onStart={setup => {
        const d: KillerDraft = { setup, live: startKiller(setup.target, Date.now()) };
        writeDraft(d);
        setDraft(d);
        setResumeAsked(false);
      }}
    />
  );

};

// ─── Setup form ──────────────────────────────────────────────────────────────

interface SetupProps {
  initialProfileId?: string;
  defaults: { target: number; zone: KillerZone; depth: KillerDepth; coach: string };
  players: ReturnType<typeof useAppData>['players'];
  categoryHint: (profileId: string) => Category | undefined;
  onStart: (s: KillerSetup) => void;
}

const SetupForm: React.FC<SetupProps> = ({ initialProfileId, defaults, players, categoryHint, onStart }) => {
  const initialProfile = initialProfileId ? players.find(p => p.id === initialProfileId) : undefined;
  const [query, setQuery] = useState(initialProfile ? `${initialProfile.firstName} ${initialProfile.lastName}`.trim() : '');
  const [profileId, setProfileId] = useState<string | undefined>(initialProfile?.id);
  const [category, setCategory] = useState<Category>(
    (initialProfile && categoryHint(initialProfile.id)) || 'seconda'
  );
  const [coach, setCoach] = useState(defaults.coach);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [target, setTarget] = useState(String(defaults.target));
  const [zone, setZone] = useState<KillerZone>(defaults.zone);
  const [depth, setDepth] = useState<KillerDepth>(defaults.depth);
  const [note, setNote] = useState('');

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || profileId) return [];
    return players
      .filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || `${p.lastName} ${p.firstName}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, players, profileId]);

  const targetNum = Math.round(Number(target));
  const targetValid = Number.isFinite(targetNum) && targetNum >= 2 && targetNum <= 1000;
  const canStart = query.trim().length > 0 && targetValid;

  const input = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Nuovo test Killer" subtitle="Consistenza · pazienza · concentrazione" backTo="/killer" />
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <Card title="Giocatore">
          <div className="space-y-3">
            <div className="relative">
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setProfileId(undefined); }}
                placeholder="Cerca in anagrafica o scrivi nome e cognome"
                className={input}
                autoComplete="off"
              />
              {profileId && <p className="text-xs text-ok-600 font-semibold mt-1">✓ Profilo collegato</p>}
              {!profileId && query.trim() && suggestions.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">Nuovo giocatore: verrà creato un profilo al salvataggio.</p>
              )}
              {suggestions.length > 0 && (
                <div className="mt-1 border border-gray-200 rounded-xl bg-white shadow-sm divide-y divide-gray-100 overflow-hidden">
                  {suggestions.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setProfileId(p.id);
                        setQuery(`${p.firstName} ${p.lastName}`.trim());
                        const c = categoryHint(p.id);
                        if (c) setCategory(c);
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-50"
                    >
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

        <Card title="Regole" subtitle="Una palla di dritto e una di rovescio, a ritmo semplice. All'errore si raccolgono le palle e si riparte da zero.">
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Palle consecutive da completare</span>
              <input type="number" inputMode="numeric" min={2} max={1000} value={target}
                onChange={e => setTarget(e.target.value)} className={`${input} mt-1 text-lg font-bold`} />
              {!targetValid && <span className="text-xs text-red-600">Inserisci un numero tra 2 e 1000.</span>}
            </label>
            <div>
              <span className="text-xs font-medium text-gray-600">Direzione</span>
              <div className="mt-1 space-y-2">
                {(Object.keys(ZONE_LABELS) as KillerZone[]).map(z => (
                  <button key={z} type="button" onClick={() => setZone(z)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border-2 text-sm ${zone === z ? 'border-brand-500 bg-brand-50 font-semibold' : 'border-gray-200 bg-white'}`}>
                    {ZONE_LABELS[z]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-600">Profondità</span>
              <div className="mt-1 space-y-2">
                {(Object.keys(DEPTH_LABELS) as KillerDepth[]).map(d => (
                  <button key={d} type="button" onClick={() => setDepth(d)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border-2 text-sm ${depth === d ? 'border-brand-500 bg-brand-50 font-semibold' : 'border-gray-200 bg-white'}`}>
                    {DEPTH_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder="Note (facoltative)" className={`${input} resize-none`} />
          </div>
        </Card>

        <Button size="lg" className="w-full justify-center text-base" disabled={!canStart}
          onClick={() => onStart({
            profileId, name: query.trim(), category, coach: coach.trim(), date,
            target: targetNum, zone, depth, note,
          })}>
          ▶ Inizia il test
        </Button>
      </div>
    </div>
  );
};

// ─── Live test (on court) ────────────────────────────────────────────────────

interface LiveProps {
  draft: KillerDraft;
  onDraftChange: (d: KillerDraft) => void;
  onFinish: (d: KillerDraft) => Promise<void>;
}

const LiveTest: React.FC<LiveProps> = ({ draft, onDraftChange, onFinish }) => {
  const [live, dispatchRaw] = useReducer(killerReducer, draft.live);
  const [now, setNow] = useState(Date.now());
  const [errorBall, setErrorBall] = useState<number | null>(null); // open "error" sheet
  const [saving, setSaving] = useState(false);
  const setupRef = useRef(draft.setup);
  const finishing = useRef(false);

  const dispatch = useCallback((a: KillerAction) => dispatchRaw(a), []);

  // Persist every change, and finish when the test ends
  useEffect(() => {
    const d = { setup: setupRef.current, live };
    onDraftChange(d);
    if (live.phase === 'done' && !finishing.current) {
      finishing.current = true;
      setSaving(true);
      buzz(live.completed ? [80, 60, 80, 60, 200] : 120);
      onFinish(d).catch(err => {
        console.error(err);
        finishing.current = false;
        setSaving(false);
        alert('Salvataggio non riuscito. Il test resta salvato sul telefono: riprova.');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  useWakeLock(live.phase !== 'done');

  const { setup } = draft;
  const clock = killerClock(live, now);
  const nextBall = live.count + 1;
  const nextStroke = strokeForBall(nextBall);
  const best = Math.max(live.count, ...live.attempts.map(a => a.balls), 0);
  const errors = live.attempts.filter(a => a.errorStroke !== null).length;
  const lastRun = live.attempts[live.attempts.length - 1];
  const progress = Math.min(100, (live.count / live.target) * 100);

  if (saving) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-5xl">{live.completed ? '🏆' : '⏹'}</div>
        <p className="text-xl font-black">{live.completed ? `${live.target} di fila!` : 'Test terminato'}</p>
        <p className="text-neutral-400 text-sm">Salvataggio…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col select-none">
      {/* Top bar */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-3 border-b border-white/10">
        <img src="./logo.png" alt="" className="h-8 w-8" />
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{setup.name}</p>
          <p className="text-[11px] text-neutral-400 truncate">
            Killer {setup.target} · {setup.zone === 'libera' ? 'campo libero' : 'pari/dispari'}{setup.depth === 'oltre_servizio' ? ' · oltre servizio' : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-neutral-400">Gioco</p>
          <p className="font-mono font-bold tabular-nums">{formatDuration(clock.playMs)}</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 text-center py-2 bg-neutral-950 border-b border-white/10">
        <div><p className="text-[11px] text-neutral-400">Partenza</p><p className="font-bold">{live.attempts.length + (live.phase === 'playing' ? 1 : 0)}</p></div>
        <div><p className="text-[11px] text-neutral-400">Errori</p><p className="font-bold text-brand-400">{errors}</p></div>
        <div><p className="text-[11px] text-neutral-400">Serie migliore</p><p className="font-bold">{best}</p></div>
      </div>

      {live.phase === 'playing' && (
        <>
          {/* Tap area: one tap per good ball */}
          <button
            type="button"
            onClick={() => { buzz(15); dispatch({ type: 'tap', now: Date.now() }); }}
            className="flex-1 flex flex-col items-center justify-center px-4 active:bg-white/5 transition-colors"
            aria-label="Palla buona"
          >
            <p className="text-neutral-400 text-sm">tocca a ogni palla buona</p>
            <p className="text-[7rem] leading-none font-black tabular-nums mt-2">{live.count}</p>
            <p className="text-neutral-400 font-semibold">su {live.target}</p>
            <div className="w-full max-w-xs h-2 bg-white/10 rounded-full mt-4 overflow-hidden">
              <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className={`mt-5 px-4 py-1.5 rounded-full text-sm font-bold ${nextStroke === 'fh' ? 'bg-white text-black' : 'bg-neutral-700 text-white'}`}>
              Palla {nextBall} · {STROKE_LABEL[nextStroke].toUpperCase()}
            </p>
          </button>

          <div className="px-4 pb-4 space-y-3">
            <button
              type="button"
              onClick={() => { buzz(60); setErrorBall(nextBall); }}
              className="w-full py-6 rounded-2xl bg-brand-600 active:bg-brand-700 text-2xl font-black tracking-wide shadow-lg"
            >
              ✕ ERRORE
            </button>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button type="button" onClick={() => dispatch({ type: 'undo' })} disabled={live.count === 0}
                className="py-3 rounded-xl bg-white/10 disabled:opacity-30">↶ Annulla tocco</button>
              <button type="button" onClick={() => {
                if (window.confirm(`Confermi che ha completato tutte le ${live.target} palle di fila?`)) dispatch({ type: 'complete', now: Date.now() });
              }} className="py-3 rounded-xl bg-ok-600/80">✓ Completate {live.target}</button>
              <button type="button" onClick={() => {
                if (window.confirm('Terminare il test adesso? Verrà salvato come non completato.')) dispatch({ type: 'stop', now: Date.now() });
              }} className="py-3 rounded-xl bg-white/10">⏹ Termina</button>
            </div>
          </div>
        </>
      )}

      {live.phase === 'pickup' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-brand-400 font-bold uppercase tracking-widest text-sm">Raccolta palle</p>
          <p className="text-6xl font-black font-mono tabular-nums mt-3">{formatDuration(now - (live.pickupStartedAt ?? now))}</p>
          <p className="text-neutral-400 text-xs mt-1">il cronometro di gioco è fermo</p>
          {lastRun && lastRun.errorStroke && (
            <p className="mt-6 text-lg">
              Errore alla palla <strong>{lastRun.balls + 1}</strong> · {STROKE_LABEL[lastRun.errorStroke].toLowerCase()}
            </p>
          )}
          <button type="button" onClick={() => { buzz(30); dispatch({ type: 'restart', now: Date.now() }); }}
            className="mt-8 w-full max-w-sm py-6 rounded-2xl bg-white text-black text-2xl font-black active:bg-neutral-200">
            ▶ RIPARTI DA ZERO
          </button>
          <button type="button" onClick={() => {
            if (window.confirm('Terminare il test adesso? Verrà salvato come non completato.')) dispatch({ type: 'stop', now: Date.now() });
          }} className="mt-4 text-sm text-neutral-400 underline">Termina il test</button>
        </div>
      )}

      {/* Error sheet: confirm on which ball the error happened */}
      {errorBall !== null && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-end" onClick={() => setErrorBall(null)}>
          <div className="w-full bg-white text-black rounded-t-3xl p-5 pb-8" onClick={e => e.stopPropagation()}>
            <p className="text-center text-sm text-gray-500">Errore alla palla numero</p>
            <p className="text-center text-6xl font-black tabular-nums mt-1">{errorBall}</p>
            <p className="text-center text-sm font-semibold text-brand-700 mt-1">{STROKE_LABEL[strokeForBall(errorBall)]}</p>
            <div className="grid grid-cols-4 gap-2 mt-4">
              {[-10, -1, +1, +10].map(d => (
                <button key={d} type="button"
                  onClick={() => setErrorBall(b => Math.min(live.target, Math.max(1, (b ?? 1) + d)))}
                  className="py-3 rounded-xl bg-gray-100 font-bold text-lg active:bg-gray-200">
                  {d > 0 ? `+${d}` : d}
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              {live.count > 0 ? `Hai contato ${live.count} palle buone in questa partenza.` : 'Se non hai toccato a ogni palla, imposta qui il numero.'}
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button type="button" onClick={() => setErrorBall(null)} className="py-4 rounded-2xl border-2 border-gray-300 font-bold">Annulla</button>
              <button type="button" onClick={() => {
                dispatch({ type: 'error', ball: errorBall, now: Date.now() });
                setErrorBall(null);
              }} className="py-4 rounded-2xl bg-brand-600 text-white font-black">Conferma errore</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
