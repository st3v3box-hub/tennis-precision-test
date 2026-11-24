import type {
  Category, Direction, MatchResult, MatchSeries, MatchSession, MatchStationId, SeriesResult, TestSession, TestType,
} from '../types';
import { MODULE_STEP_ORDER } from './protocol';

// ═════════════════════════════════════════════════════════════════════════════
// MATCH TEST — "Mezzogiorno" race
//
// The player has to put `playerTarget` balls (default 100) in the zone.
// Every series that is not perfect (< 10/10) is a point for the court.
// The court wins at `courtTarget` points. The court target is the handicap.
// ═════════════════════════════════════════════════════════════════════════════

export interface MatchStation {
  id: MatchStationId;
  label: string;
  short: string;
  testType: TestType;
  direction: Direction;
}

/** What the coach can feed during a match. Series rotate through the chosen stations. */
export const MATCH_STATIONS: MatchStation[] = [
  { id: 'fh_cross', label: 'Dritto incrociato', short: 'Dritto incr.', testType: 'forehand', direction: 'fh_cross' },
  { id: 'bh_cross', label: 'Rovescio incrociato', short: 'Rovescio incr.', testType: 'backhand', direction: 'bh_cross' },
  { id: 'fh_line', label: 'Dritto lungolinea', short: 'Dritto LL', testType: 'forehand', direction: 'fh_line' },
  { id: 'bh_line', label: 'Rovescio lungolinea', short: 'Rovescio LL', testType: 'backhand', direction: 'bh_line' },
  { id: 'io_cross', label: 'Sventaglio inside-out', short: 'Inside-out', testType: 'insideout', direction: 'io_cross' },
  { id: 'io_line', label: 'Sventaglio inside-in', short: 'Inside-in', testType: 'insideout', direction: 'io_line' },
  { id: 'volley_fh', label: 'Volée di dritto', short: 'Volée dritto', testType: 'volley', direction: 'fh_volley' },
  { id: 'volley_bh', label: 'Volée di rovescio', short: 'Volée rovescio', testType: 'volley', direction: 'bh_volley' },
  { id: 'return_r', label: 'Risposta da destra', short: 'Risposta dx', testType: 'return', direction: 'right' },
  { id: 'return_l', label: 'Risposta da sinistra', short: 'Risposta sx', testType: 'return', direction: 'left' },
];

export const DEFAULT_STATIONS: MatchStationId[] = ['fh_cross', 'bh_cross'];

export const stationById = (id: MatchStationId): MatchStation =>
  MATCH_STATIONS.find(s => s.id === id) ?? MATCH_STATIONS[0];

/** Station of the n-th series (0-based): the chosen stations in rotation. */
export function stationForSeries(stations: MatchStationId[], n: number): MatchStation {
  const list = stations.length > 0 ? stations : DEFAULT_STATIONS;
  return stationById(list[n % list.length]);
}

export const RESULT_LABEL: Record<MatchResult, string> = {
  in_corso: 'In corso',
  vinto: 'Vinto',
  perso: 'Perso',
  interrotto: 'Interrotto',
};

// ─── Race state ──────────────────────────────────────────────────────────────

export interface RaceState {
  balls: number;
  court: number;
  played: number;
  perfect: number;
  result: MatchResult;
  /** Balls still needed / court points still needed */
  ballsLeft: number;
  courtLeft: number;
}

/**
 * Replays the series. The race stops at the first target reached: series after it
 * (should never exist) are ignored. `stopped` = coach closed the match early.
 */
export function raceState(
  series: { score: number }[], playerTarget: number, courtTarget: number, stopped = false,
): RaceState {
  let balls = 0;
  let court = 0;
  let played = 0;
  let perfect = 0;
  let result: MatchResult = 'in_corso';
  for (const s of series) {
    played++;
    balls += s.score;
    if (s.score === 10) perfect++;
    if (balls >= playerTarget) { result = 'vinto'; break; }
    if (s.score < 10) court++;
    if (court >= courtTarget) { result = 'perso'; break; }
  }
  if (result === 'in_corso' && stopped) result = 'interrotto';
  return {
    balls, court, played, perfect, result,
    ballsLeft: Math.max(0, playerTarget - balls),
    courtLeft: Math.max(0, courtTarget - court),
  };
}

// ─── Handicap: exact win probability ─────────────────────────────────────────

/** Probability of each series score 0..10 (sums to 1). */
export type ScoreDistribution = number[];

export function distributionOf(scores: number[]): ScoreDistribution | null {
  const valid = scores.filter(s => Number.isFinite(s) && s >= 0 && s <= 10).map(s => Math.round(s));
  if (valid.length === 0) return null;
  const d = new Array(11).fill(0);
  valid.forEach(s => { d[s] += 1; });
  return d.map(v => v / valid.length);
}

export interface RaceOdds {
  /** Probability that the player wins, 0–1 */
  win: number;
  /** Expected number of series until the match ends */
  expectedSeries: number;
}

/**
 * Exact odds from the starting position (or any position), assuming every series is an
 * independent draw from `dist`. Dynamic programming over (balls, court points).
 */
export function raceOdds(
  dist: ScoreDistribution, playerTarget: number, courtTarget: number, fromBalls = 0, fromCourt = 0,
): RaceOdds {
  const T = Math.max(1, Math.round(playerTarget));
  const C = Math.max(1, Math.round(courtTarget));
  if (fromBalls >= T) return { win: 1, expectedSeries: 0 };
  if (fromCourt >= C) return { win: 0, expectedSeries: 0 };
  // A player who can never score and never miss would loop forever: guard degenerate input
  if (dist[0] >= 1) return { win: 0, expectedSeries: C - fromCourt };
  if (dist[10] >= 1) return { win: 1, expectedSeries: Math.ceil((T - fromBalls) / 10) };

  const W: Float64Array[] = Array.from({ length: T }, () => new Float64Array(C));
  const E: Float64Array[] = Array.from({ length: T }, () => new Float64Array(C));
  for (let b = T - 1; b >= 0; b--) {
    for (let c = C - 1; c >= 0; c--) {
      let w = 0;
      let e = 1;
      for (let s = 0; s <= 10; s++) {
        const q = dist[s];
        if (q === 0) continue;
        const nb = b + s;
        if (nb >= T) { w += q; continue; }
        const nc = s < 10 ? c + 1 : c;
        if (nc >= C) continue; // court wins: contributes 0 to w and 0 further series
        // s === 10 always moves nb forward, s < 10 always moves nc forward: (nb, nc) is
        // already computed because loops go downwards in both b and c.
        w += q * W[nb][nc];
        e += q * E[nb][nc];
      }
      W[b][c] = w;
      E[b][c] = e;
    }
  }
  return { win: W[fromBalls][fromCourt], expectedSeries: E[fromBalls][fromCourt] };
}

/** Court target that makes the match closest to 50–50 for this player. */
export function balancedCourtTarget(dist: ScoreDistribution, playerTarget: number, min = 2, max = 60): number {
  let best = min;
  let bestGap = Infinity;
  for (let c = min; c <= max; c++) {
    const gap = Math.abs(raceOdds(dist, playerTarget, c).win - 0.5);
    if (gap < bestGap - 1e-9) { best = c; bestGap = gap; }
  }
  return best;
}

/** Series that tell how this player performs on the chosen strokes. */
export interface PlayerHistory {
  scores: number[];
  /** How many tests and matches the scores come from */
  sources: number;
  /** true when the scores are on the same strokes as the match; false = all strokes */
  sameStrokes: boolean;
}

const MIN_HISTORY = 8;

/**
 * Recent series of a player, newest first: completed tests and finished matches.
 * Prefers series on the chosen strokes; falls back to every stroke of those tests.
 */
export function playerHistory(
  playerId: string, stations: MatchStationId[], sessions: TestSession[], matches: MatchSession[], maxSeries = 60,
): PlayerHistory | null {
  const chosen = (stations.length ? stations : DEFAULT_STATIONS).map(stationById);
  const matchesStation = (r: { testType: TestType; direction?: Direction }) =>
    chosen.some(st => (r.testType === st.testType || (r.testType === 'groundstrokes' && (st.testType === 'forehand' || st.testType === 'backhand')))
      && (r.direction === undefined || r.direction === st.direction));

  type Src = { at: string; series: { testType: TestType; direction?: Direction; score: number }[] };
  const sources: Src[] = [
    ...sessions.filter(s => s.playerId === playerId && s.completed && s.series.length > 0)
      .map(s => ({ at: s.date + s.createdAt, series: s.series as SeriesResult[] })),
    ...matches.filter(m => m.playerId === playerId && m.result !== 'in_corso' && m.series.length > 0)
      .map(m => ({ at: m.date + m.createdAt, series: m.series })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  if (sources.length === 0) return null;

  const pick = (filter: boolean) => {
    const out: number[] = [];
    let used = 0;
    for (const src of sources) {
      const scores = src.series.filter(r => !filter || matchesStation(r)).map(r => r.score);
      if (scores.length === 0) continue;
      out.push(...scores);
      used++;
      if (out.length >= maxSeries) break;
    }
    return { scores: out.slice(0, maxSeries), used };
  };
  const same = pick(true);
  if (same.scores.length >= MIN_HISTORY) return { scores: same.scores, sources: same.used, sameStrokes: true };
  const all = pick(false);
  if (all.scores.length >= MIN_HISTORY) return { scores: all.scores, sources: all.used, sameStrokes: false };
  return null;
}

// ─── Match analysis ──────────────────────────────────────────────────────────

export interface MatchTimelinePoint {
  n: number;
  score: number;
  balls: number;
  court: number;
  /** % of each target reached after this series */
  playerPct: number;
  courtPct: number;
  /** Court one or two points from winning before this series */
  pressure: boolean;
}

export interface MatchStats {
  race: RaceState;
  timeline: MatchTimelinePoint[];
  avgScore: number;
  insidePct: number;
  bestPerfectStreak: number;
  /** Average score of series played with the court ≤ 2 points from winning */
  pressureAvg: number | null;
  pressureSeries: number;
  normalAvg: number | null;
  /** Average score per station */
  byStation: { id: MatchStationId; label: string; avg: number; series: number; perfect: number }[];
}

export function matchStats(m: Pick<MatchSession, 'series' | 'playerTarget' | 'courtTarget' | 'result'>): MatchStats {
  const race = raceState(m.series, m.playerTarget, m.courtTarget, m.result === 'interrotto');
  const played = m.series.slice(0, race.played);
  const timeline: MatchTimelinePoint[] = [];
  let balls = 0;
  let court = 0;
  let streak = 0;
  let bestStreak = 0;
  const pressureScores: number[] = [];
  const normalScores: number[] = [];
  played.forEach((s, i) => {
    const pressure = m.courtTarget - court <= 2;
    (pressure ? pressureScores : normalScores).push(s.score);
    balls += s.score;
    // Same rule as raceState: balls first, so the winning series gives the court nothing
    if (s.score < 10 && balls < m.playerTarget) court++;
    streak = s.score === 10 ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
    timeline.push({
      n: i + 1, score: s.score, balls, court, pressure,
      playerPct: Math.min(100, (balls / m.playerTarget) * 100),
      courtPct: Math.min(100, (court / m.courtTarget) * 100),
    });
  });
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const byStation = MATCH_STATIONS
    .map(st => {
      const sc = played.filter(s => s.station === st.id).map(s => s.score);
      return { id: st.id, label: st.label, avg: avg(sc) ?? 0, series: sc.length, perfect: sc.filter(x => x === 10).length };
    })
    .filter(x => x.series > 0);
  const total = played.reduce((a, s) => a + s.score, 0);
  return {
    race, timeline,
    avgScore: avg(played.map(s => s.score)) ?? 0,
    insidePct: played.length ? (total / (played.length * 10)) * 100 : 0,
    bestPerfectStreak: bestStreak,
    pressureAvg: avg(pressureScores),
    pressureSeries: pressureScores.length,
    normalAvg: avg(normalScores),
    byStation,
  };
}

/** "Tu 64 · Campo 6" style short score */
export function raceScoreLabel(r: RaceState, courtTarget: number, playerTarget: number): string {
  return `${r.balls}/${playerTarget} – ${r.court}/${courtTarget}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// GAME SIMULATION — reading a test as a tennis set
//
// Every series is a point: won when the series reaches the threshold of the
// category (e.g. 8/10), otherwise it goes to the imaginary opponent.
// Games with a deciding point at 40-40, sets to 6 with a tie-break (7, by 2) at 6-6.
// When a set ends, the next one starts.
// ═════════════════════════════════════════════════════════════════════════════

export interface GameSimState {
  /** Finished sets, player games first */
  sets: [number, number][];
  /** Games in the current set */
  games: [number, number];
  /** Points in the current game (or tie-break) */
  points: [number, number];
  tieBreak: boolean;
  pointsWon: number;
  pointsPlayed: number;
}

export function simulateGames(scores: number[], threshold: number): GameSimState {
  const st: GameSimState = { sets: [], games: [0, 0], points: [0, 0], tieBreak: false, pointsWon: 0, pointsPlayed: 0 };
  for (const sc of scores) {
    const w = sc >= threshold ? 0 : 1;
    st.pointsPlayed++;
    if (w === 0) st.pointsWon++;
    st.points[w]++;
    const [a, b] = st.points;
    const gameOver = st.tieBreak
      ? (a >= 7 || b >= 7) && Math.abs(a - b) >= 2
      : a === 4 || b === 4; // deciding point at 3-3: the 7th point ends the game
    if (!gameOver) continue;
    st.points = [0, 0];
    st.games[w]++;
    const [g1, g2] = st.games;
    const setOver = st.tieBreak || ((g1 >= 6 || g2 >= 6) && Math.abs(g1 - g2) >= 2);
    if (setOver) {
      st.sets.push([g1, g2]);
      st.games = [0, 0];
      st.tieBreak = false;
    } else if (g1 === 6 && g2 === 6) {
      st.tieBreak = true;
    }
  }
  return st;
}

const POINT_NAMES = ['0', '15', '30', '40'];

/** "15-30", "40-40 punto decisivo", "tie-break 5-3", or '' at the start of a game */
export function gamePointsLabel(st: GameSimState): string {
  const [a, b] = st.points;
  if (a === 0 && b === 0) return '';
  if (st.tieBreak) return `tie-break ${a}-${b}`;
  if (a === 3 && b === 3) return '40-40 punto decisivo';
  return `${POINT_NAMES[a]}-${POINT_NAMES[b]}`;
}

/** "6-4 3-1 (30-15)" — the current set is shown only when started */
export function gameScoreLabel(st: GameSimState): string {
  const parts = st.sets.map(([a, b]) => `${a}-${b}`);
  const current = st.games[0] + st.games[1] > 0 || st.points[0] + st.points[1] > 0;
  if (current || parts.length === 0) parts.push(`${st.games[0]}-${st.games[1]}`);
  const pts = gamePointsLabel(st);
  return pts ? `${parts.join(' ')} (${pts})` : parts.join(' ');
}

/** Series of a test in protocol order (module by module, series by series). */
export function seriesInPlayOrder(series: SeriesResult[]): number[] {
  return [...series]
    .sort((a, b) => {
      const ma = MODULE_STEP_ORDER.indexOf(a.testType);
      const mb = MODULE_STEP_ORDER.indexOf(b.testType);
      return ma !== mb ? ma - mb : a.seriesIndex - b.seriesIndex;
    })
    .map(s => s.score);
}

export function gameThresholdFor(category: Category, thresholds: Record<Category, number>): number {
  const t = Math.round(thresholds[category]);
  return Number.isFinite(t) && t >= 1 && t <= 10 ? t : 8;
}

export const SERIES_MINUTES = 1.5;
export const minutesLabel = (series: number) => `${Math.round(series * SERIES_MINUTES)} min`;

export type { MatchSeries };
