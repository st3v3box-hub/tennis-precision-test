import type { Category, AppState, Player, PlayerProfile, TestSession, AppSettings, ZoneCategory, ZoneMeasures } from '../types';
import { PROTOCOL_ZONES, ZONE_CATEGORIES, clampMeasures } from './zones';

const KEY = 'tpt_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  stdDevMode: 'sample',
  precisionTimeStrategy: 'A',
  scoreScale: 'radar',
  killerTarget: 100,
  killerZone: 'libera',
  killerDepth: 'libera',
  promotionTargets: { u10_u12: 7.5, terza: 8, seconda: 8, prima: 8.5 },
  promotionConsecutive: 2,
  zoneDefaults: PROTOCOL_ZONES,
  zoneLog: [],
  includeCustomZones: false,
  // From the simulation on the academy's real tests: these targets give
  // roughly even matches for a typical player of each category.
  matchPlayerTarget: 100,
  matchCourtTargets: { u10_u12: 15, terza: 15, seconda: 12, prima: 9 },
  matchGameThresholds: { u10_u12: 7, terza: 7, seconda: 8, prima: 9 },
};

function intIn(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

function perCategory(raw: unknown, fallback: Record<Category, number>, min: number, max: number): Record<Category, number> {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<Category, unknown>>;
  const out = {} as Record<Category, number>;
  (Object.keys(fallback) as Category[]).forEach(c => { out[c] = intIn(r[c], min, max, fallback[c]); });
  return out;
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { players: [], playerProfiles: [], sessions: [], settings: DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      players: parsed.players ?? [],
      playerProfiles: parsed.playerProfiles ?? [],
      sessions: parsed.sessions ?? [],
      settings: normalizeSettings(parsed.settings),
    };
  } catch {
    return { players: [], playerProfiles: [], sessions: [], settings: DEFAULT_SETTINGS };
  }
}

/** Fills in defaults for settings saved by older versions of the app (deep-merges nested objects). */
export function normalizeSettings(raw: Partial<AppSettings> | undefined | null): AppSettings {
  const s = raw ?? {};
  const target = Number(s.killerTarget);
  const consecutive = Number(s.promotionConsecutive);
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    killerTarget: Number.isFinite(target) && target >= 1 ? Math.round(target) : DEFAULT_SETTINGS.killerTarget,
    promotionConsecutive:
      Number.isFinite(consecutive) && consecutive >= 1 ? Math.round(consecutive) : DEFAULT_SETTINGS.promotionConsecutive,
    promotionTargets: { ...DEFAULT_SETTINGS.promotionTargets, ...(s.promotionTargets ?? {}) },
    zoneDefaults: normalizeZoneDefaults(s.zoneDefaults),
    zoneLog: Array.isArray(s.zoneLog) ? s.zoneLog : [],
    includeCustomZones: s.includeCustomZones === true,
    matchPlayerTarget: intIn(s.matchPlayerTarget, 10, 1000, DEFAULT_SETTINGS.matchPlayerTarget),
    matchCourtTargets: perCategory(s.matchCourtTargets, DEFAULT_SETTINGS.matchCourtTargets, 1, 100),
    matchGameThresholds: perCategory(s.matchGameThresholds, DEFAULT_SETTINGS.matchGameThresholds, 1, 10),
  };
}

function normalizeZoneDefaults(raw: Partial<Record<ZoneCategory, Partial<ZoneMeasures>>> | undefined): Record<ZoneCategory, ZoneMeasures> {
  const out = {} as Record<ZoneCategory, ZoneMeasures>;
  for (const c of ZONE_CATEGORIES) {
    const merged = { ...PROTOCOL_ZONES[c], ...(raw?.[c] ?? {}) } as ZoneMeasures;
    out[c] = clampMeasures(merged, c);
  }
  return out;
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

// ─── Last coach (for quick-start pre-fill) ───────────────────────────────────

export function getLastCoach(): string {
  return localStorage.getItem('tpt_last_coach') ?? '';
}

export function setLastCoach(coach: string): void {
  if (coach.trim()) localStorage.setItem('tpt_last_coach', coach.trim());
}
