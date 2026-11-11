import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  collection, doc, setDoc, getDocsFromServer, getDocFromServer, onSnapshot, writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { PlayerProfile, TestSession, AppSettings, KillerSession } from '../types';
import { loadState, DEFAULT_SETTINGS, normalizeSettings } from '../lib/storage';

/** Sync state shown in the UI so coaches know whether data reached the cloud. */
export interface SyncStatus {
  online: boolean;
  /** Writes made on this device that the server has not confirmed yet */
  pending: number;
  /** Last write the server rejected (e.g. permissions), if any */
  error: string | null;
}

interface AppDataContextValue {
  players: PlayerProfile[];
  sessions: TestSession[];
  killerSessions: KillerSession[];
  settings: AppSettings;
  lastCoach: string;
  loading: boolean;
  sync: SyncStatus;
  clearSyncError: () => void;

  upsertPlayer: (profile: PlayerProfile) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  getPlayer: (id: string) => PlayerProfile | undefined;
  getPlayerSessions: (playerId: string) => TestSession[];
  getChallengeSessions: (challengeId: string) => TestSession[];
  getSession: (id: string) => TestSession | undefined;
  upsertSession: (session: TestSession) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  upsertKiller: (session: KillerSession) => Promise<void>;
  deleteKiller: (id: string) => Promise<void>;
  saveSettings: (s: AppSettings) => Promise<void>;
  saveLastCoach: (coach: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
}

/**
 * How long a save waits for the server before letting the UI continue.
 * Online, the server answers well within this window, so real errors still reach
 * the caller. Offline, the write stays queued on the device and syncs later —
 * the UI must not hang waiting for a network that is not there.
 */
const ACK_WAIT_MS = 1500;

function upsertLocal<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex(x => x.id === item.id);
  if (idx < 0) return [...list, item];
  const next = [...list];
  next[idx] = item;
  return next;
}

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [killerSessions, setKillerSessions] = useState<KillerSession[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [lastCoach, setLastCoachState] = useState('');
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [pending, setPending] = useState(0);
  // Documents with local changes not yet confirmed by the server, per collection.
  // Comes from Firestore itself, so it also covers writes queued before a reload.
  const [pendingDocs, setPendingDocs] = useState<Record<string, number>>({});
  const [syncError, setSyncError] = useState<string | null>(null);
  const mounted = useRef(true);

  // ── Online/offline indicator ────────────────────────────────────────────────
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  // ── Live data (served from the device cache first, then kept in sync) ──────
  useEffect(() => {
    mounted.current = true;
    const ready = { players: false, sessions: false, killer: false, meta: false };
    const markReady = (k: keyof typeof ready) => {
      ready[k] = true;
      if (Object.values(ready).every(Boolean) && mounted.current) setLoading(false);
    };
    const onError = (k: keyof typeof ready) => (err: Error) => {
      console.error(`Firestore listener (${k}) error:`, err);
      markReady(k);
    };

    const countPending = (k: string, n: number) =>
      setPendingDocs(prev => (prev[k] === n ? prev : { ...prev, [k]: n }));

    const unsubs = [
      onSnapshot(collection(db, 'players'), { includeMetadataChanges: true }, snap => {
        setPlayers(snap.docs.map(d => d.data() as PlayerProfile));
        countPending('players', snap.docs.filter(d => d.metadata.hasPendingWrites).length);
        markReady('players');
      }, onError('players')),
      onSnapshot(collection(db, 'sessions'), { includeMetadataChanges: true }, snap => {
        setSessions(snap.docs.map(d => d.data() as TestSession));
        countPending('sessions', snap.docs.filter(d => d.metadata.hasPendingWrites).length);
        markReady('sessions');
      }, onError('sessions')),
      onSnapshot(collection(db, 'killer'), { includeMetadataChanges: true }, snap => {
        setKillerSessions(snap.docs.map(d => d.data() as KillerSession));
        countPending('killer', snap.docs.filter(d => d.metadata.hasPendingWrites).length);
        markReady('killer');
      }, onError('killer')),
      onSnapshot(doc(db, 'meta', 'app'), snap => {
        if (snap.exists()) {
          const data = snap.data();
          setSettings(normalizeSettings(data.settings));
          setLastCoachState(data.lastCoach ?? '');
        }
        markReady('meta');
      }, onError('meta')),
    ];

    // Safety net: never leave the app stuck on the loading screen.
    const timeout = window.setTimeout(() => { if (mounted.current) setLoading(false); }, 8000);

    return () => {
      mounted.current = false;
      window.clearTimeout(timeout);
      unsubs.forEach(u => u());
    };
  }, []);

  // ── One-time migration from the old localStorage version ───────────────────
  // Runs only when the SERVER confirms the cloud was never initialised (no meta doc
  // and no data). Offline or on error it simply does nothing and retries next start.
  useEffect(() => {
    (async () => {
      try {
        const meta = await getDocFromServer(doc(db, 'meta', 'app'));
        if (meta.exists()) return;
        const [p, s] = await Promise.all([
          getDocsFromServer(collection(db, 'players')),
          getDocsFromServer(collection(db, 'sessions')),
        ]);
        if (!p.empty || !s.empty) return;
        const local = loadState();
        const batch = writeBatch(db);
        local.playerProfiles.forEach(pr => batch.set(doc(db, 'players', pr.id), pr));
        local.sessions.forEach(se => batch.set(doc(db, 'sessions', se.id), se));
        batch.set(doc(db, 'meta', 'app'), {
          settings: local.settings,
          lastCoach: localStorage.getItem('tpt_last_coach') ?? '',
        }, { merge: true });
        await batch.commit();
      } catch (err) {
        console.warn('Migration check skipped:', err);
      }
    })();
  }, []);

  /**
   * Starts a write and waits briefly for the server. Offline the write stays
   * queued on the device (Firestore persists it) and this resolves anyway.
   * Errors that arrive later are shown through `sync.error`.
   */
  const queueWrite = useCallback(async (write: () => Promise<void>, label: string): Promise<void> => {
    setPending(n => n + 1);
    const promise = write();
    const tracked = promise
      .then(() => undefined)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Save failed (${label}):`, err);
        if (mounted.current) setSyncError(`${label}: ${msg}`);
        throw err;
      })
      .finally(() => { if (mounted.current) setPending(n => Math.max(0, n - 1)); });

    let timer: number | undefined;
    const timeout = new Promise<'timeout'>(resolve => {
      timer = window.setTimeout(() => resolve('timeout'), ACK_WAIT_MS);
    });
    try {
      await Promise.race([tracked, timeout]); // rethrows if the server rejected within the window
    } finally {
      window.clearTimeout(timer);
    }
    tracked.catch(() => { /* already reported through sync.error */ });
  }, []);

  const upsertPlayer = useCallback(async (profile: PlayerProfile) => {
    setPlayers(prev => upsertLocal(prev, profile));
    await queueWrite(() => setDoc(doc(db, 'players', profile.id), profile), 'Giocatore');
  }, [queueWrite]);

  /** Deletes a player together with all of their tests (precision and Killer). */
  const deletePlayer = useCallback(async (id: string) => {
    const refs = [
      ...sessions.filter(s => s.playerId === id).map(s => doc(db, 'sessions', s.id)),
      ...killerSessions.filter(k => k.playerId === id).map(k => doc(db, 'killer', k.id)),
      doc(db, 'players', id),
    ];
    setPlayers(prev => prev.filter(p => p.id !== id));
    setSessions(prev => prev.filter(s => s.playerId !== id));
    setKillerSessions(prev => prev.filter(k => k.playerId !== id));
    // Firestore batches are limited to 500 writes
    for (let i = 0; i < refs.length; i += 450) {
      const batch = writeBatch(db);
      refs.slice(i, i + 450).forEach(r => batch.delete(r));
      await queueWrite(() => batch.commit(), 'Eliminazione giocatore');
    }
  }, [sessions, killerSessions, queueWrite]);

  const getPlayer = useCallback((id: string) => players.find(p => p.id === id), [players]);
  const getPlayerSessions = useCallback((playerId: string) => sessions.filter(s => s.playerId === playerId), [sessions]);
  const getChallengeSessions = useCallback((challengeId: string) => sessions.filter(s => s.challengeId === challengeId), [sessions]);
  const getSession = useCallback((id: string) => sessions.find(s => s.id === id), [sessions]);

  const upsertSession = useCallback(async (session: TestSession) => {
    // Optimistic local update so result pages find the session immediately
    setSessions(prev => upsertLocal(prev, session));
    await queueWrite(() => setDoc(doc(db, 'sessions', session.id), session), 'Sessione');
  }, [queueWrite]);

  const deleteSession = useCallback(async (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    const batch = writeBatch(db);
    batch.delete(doc(db, 'sessions', id));
    await queueWrite(() => batch.commit(), 'Eliminazione sessione');
  }, [queueWrite]);

  const upsertKiller = useCallback(async (session: KillerSession) => {
    setKillerSessions(prev => upsertLocal(prev, session));
    await queueWrite(() => setDoc(doc(db, 'killer', session.id), session), 'Test Killer');
  }, [queueWrite]);

  const deleteKiller = useCallback(async (id: string) => {
    setKillerSessions(prev => prev.filter(k => k.id !== id));
    const batch = writeBatch(db);
    batch.delete(doc(db, 'killer', id));
    await queueWrite(() => batch.commit(), 'Eliminazione test Killer');
  }, [queueWrite]);

  const saveSettings = useCallback(async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await queueWrite(() => setDoc(doc(db, 'meta', 'app'), { settings: newSettings }, { merge: true }), 'Impostazioni');
  }, [queueWrite]);

  const saveLastCoach = useCallback(async (coach: string) => {
    if (!coach.trim()) return;
    setLastCoachState(coach.trim());
    await queueWrite(() => setDoc(doc(db, 'meta', 'app'), { lastCoach: coach.trim() }, { merge: true }), 'Coach');
  }, [queueWrite]);

  const clearSyncError = useCallback(() => setSyncError(null), []);

  return (
    <AppDataContext.Provider value={{
      players, sessions, killerSessions, settings, lastCoach, loading,
      sync: {
        online,
        pending: Math.max(pending, Object.values(pendingDocs).reduce((a, b) => a + b, 0)),
        error: syncError,
      },
      clearSyncError,
      upsertPlayer, deletePlayer, getPlayer, getPlayerSessions, getChallengeSessions,
      getSession, upsertSession, deleteSession, upsertKiller, deleteKiller, saveSettings, saveLastCoach,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};
