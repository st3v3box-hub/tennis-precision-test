import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection, doc, setDoc, deleteDoc, getDocs, getDoc, onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { PlayerProfile, TestSession, AppSettings } from '../types';
import { loadState } from '../lib/storage';

const DEFAULT_SETTINGS: AppSettings = {
  stdDevMode: 'sample',
  precisionTimeStrategy: 'A',
};

interface AppDataContextValue {
  players: PlayerProfile[];
  sessions: TestSession[];
  settings: AppSettings;
  lastCoach: string;
  loading: boolean;

  upsertPlayer: (profile: PlayerProfile) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  getPlayer: (id: string) => PlayerProfile | undefined;
  getPlayerSessions: (playerId: string) => TestSession[];
  getSession: (id: string) => TestSession | undefined;
  upsertSession: (session: TestSession) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  saveSettings: (s: AppSettings) => Promise<void>;
  saveLastCoach: (coach: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
}

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [lastCoach, setLastCoachState] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const unsubs: (() => void)[] = [];

    const init = async () => {
      // Load all initial data in parallel
      const [playersSnap, sessionsSnap, metaSnap] = await Promise.all([
        getDocs(collection(db, 'players')),
        getDocs(collection(db, 'sessions')),
        getDoc(doc(db, 'meta', 'app')),
      ]);

      if (cancelled) return;

      if (playersSnap.empty && sessionsSnap.empty) {
        // Migrate data from localStorage
        const localState = loadState();
        const writes: Promise<void>[] = [];

        for (const profile of localState.playerProfiles) {
          writes.push(setDoc(doc(db, 'players', profile.id), profile));
        }
        for (const session of localState.sessions) {
          writes.push(setDoc(doc(db, 'sessions', session.id), session));
        }

        const metaPayload = {
          settings: localState.settings,
          lastCoach: localStorage.getItem('tpt_last_coach') ?? '',
        };
        writes.push(setDoc(doc(db, 'meta', 'app'), metaPayload, { merge: true }));

        if (writes.length > 0) await Promise.all(writes);

        if (!cancelled) {
          setPlayers(localState.playerProfiles);
          setSessions(localState.sessions);
          setSettings(localState.settings);
          setLastCoachState(metaPayload.lastCoach);
        }
      } else {
        // Use data already in Firestore
        if (!cancelled) {
          setPlayers(playersSnap.docs.map(d => d.data() as PlayerProfile));
          setSessions(sessionsSnap.docs.map(d => d.data() as TestSession));
          if (metaSnap.exists()) {
            const data = metaSnap.data();
            setSettings({ ...DEFAULT_SETTINGS, ...(data.settings ?? {}) });
            setLastCoachState(data.lastCoach ?? '');
          }
        }
      }

      if (cancelled) return;
      setLoading(false);

      // Real-time listeners for ongoing sync
      unsubs.push(
        onSnapshot(collection(db, 'players'), snap => {
          if (!cancelled) setPlayers(snap.docs.map(d => d.data() as PlayerProfile));
        }),
        onSnapshot(collection(db, 'sessions'), snap => {
          if (!cancelled) setSessions(snap.docs.map(d => d.data() as TestSession));
        }),
        onSnapshot(doc(db, 'meta', 'app'), snap => {
          if (!cancelled && snap.exists()) {
            const data = snap.data();
            setSettings({ ...DEFAULT_SETTINGS, ...(data.settings ?? {}) });
            setLastCoachState(data.lastCoach ?? '');
          }
        }),
      );
    };

    init().catch(err => {
      console.error('AppData init error:', err);
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubs.forEach(u => u());
    };
  }, []);

  const upsertPlayer = useCallback(async (profile: PlayerProfile) => {
    await setDoc(doc(db, 'players', profile.id), profile);
  }, []);

  const deletePlayer = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'players', id));
  }, []);

  const getPlayer = useCallback((id: string) => {
    return players.find(p => p.id === id);
  }, [players]);

  const getPlayerSessions = useCallback((playerId: string) => {
    return sessions.filter(s => s.playerId === playerId);
  }, [sessions]);

  const getSession = useCallback((id: string) => {
    return sessions.find(s => s.id === id);
  }, [sessions]);

  const upsertSession = useCallback(async (session: TestSession) => {
    await setDoc(doc(db, 'sessions', session.id), session);
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'sessions', id));
  }, []);

  const saveSettings = useCallback(async (newSettings: AppSettings) => {
    await setDoc(doc(db, 'meta', 'app'), { settings: newSettings }, { merge: true });
  }, []);

  const saveLastCoach = useCallback(async (coach: string) => {
    if (!coach.trim()) return;
    await setDoc(doc(db, 'meta', 'app'), { lastCoach: coach.trim() }, { merge: true });
  }, []);

  return (
    <AppDataContext.Provider value={{
      players, sessions, settings, lastCoach, loading,
      upsertPlayer, deletePlayer, getPlayer, getPlayerSessions,
      getSession, upsertSession, deleteSession, saveSettings, saveLastCoach,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};
