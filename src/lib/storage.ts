import type { AppState, Player, PlayerProfile, TestSession, AppSettings } from '../types';

const KEY = 'tpt_v1';

const DEFAULT_SETTINGS: AppSettings = {
  stdDevMode: 'sample',
  precisionTimeStrategy: 'A',
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { players: [], playerProfiles: [], sessions: [], settings: DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      players: parsed.players ?? [],
      playerProfiles: parsed.playerProfiles ?? [],
      sessions: parsed.sessions ?? [],
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return { players: [], playerProfiles: [], sessions: [], settings: DEFAULT_SETTINGS };
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Player CRUD (legacy) ─────────────────────────────────────────────────────

export function getPlayers(): Player[] {
  return loadState().players;
}

export function upsertPlayer(player: Player): void {
  const state = loadState();
  const idx = state.players.findIndex(p => p.id === player.id);
  if (idx >= 0) state.players[idx] = player;
  else state.players.push(player);
  saveState(state);
}

export function deletePlayer(id: string): void {
  const state = loadState();
  state.players = state.players.filter(p => p.id !== id);
  saveState(state);
}

// ─── PlayerProfile CRUD ───────────────────────────────────────────────────────

export function getPlayerProfiles(): PlayerProfile[] {
  return loadState().playerProfiles;
}

export function getPlayerProfile(id: string): PlayerProfile | undefined {
  return loadState().playerProfiles.find(p => p.id === id);
}

export function upsertPlayerProfile(profile: PlayerProfile): void {
  const state = loadState();
  const idx = state.playerProfiles.findIndex(p => p.id === profile.id);
  if (idx >= 0) state.playerProfiles[idx] = profile;
  else state.playerProfiles.push(profile);
  saveState(state);
}

export function deletePlayerProfile(id: string): void {
  const state = loadState();
  state.playerProfiles = state.playerProfiles.filter(p => p.id !== id);
  saveState(state);
}

// ─── Session CRUD ─────────────────────────────────────────────────────────────

export function getSessions(): TestSession[] {
  return loadState().sessions;
}

export function getSessionsByPlayer(playerId: string): TestSession[] {
  return loadState().sessions.filter(s => s.playerId === playerId);
}

export function getSession(id: string): TestSession | undefined {
  return loadState().sessions.find(s => s.id === id);
}

export function upsertSession(session: TestSession): void {
  const state = loadState();
  const idx = state.sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) state.sessions[idx] = session;
  else state.sessions.push(session);
  saveState(state);
}

export function deleteSession(id: string): void {
  const state = loadState();
  state.sessions = state.sessions.filter(s => s.id !== id);
  saveState(state);
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function getSettings(): AppSettings {
  return loadState().settings;
}

export function saveSettings(settings: AppSettings): void {
  const state = loadState();
  state.settings = settings;
  saveState(state);
}
