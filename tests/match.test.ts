import { describe, it, expect } from 'vitest';
import {
  raceState, raceOdds, balancedCourtTarget, distributionOf, simulateGames, gameScoreLabel, gamePointsLabel,
  seriesInPlayOrder, playerHistory, stationForSeries, matchStats,
} from '../src/lib/match';
import { normalizeSettings, DEFAULT_SETTINGS } from '../src/lib/storage';
import type { MatchSession, SeriesResult, TestSession } from '../src/types';

const binom = (p: number) => {
  const c = (n: number, k: number) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
  return Array.from({ length: 11 }, (_, k) => c(10, k) * p ** k * (1 - p) ** (10 - k));
};

describe('raceState', () => {
  it('player wins when the balls reach the target', () => {
    const r = raceState(Array(10).fill({ score: 10 }), 100, 10);
    expect(r).toMatchObject({ balls: 100, court: 0, result: 'vinto', played: 10, perfect: 10 });
  });
  it('a winning series does not give the court a point even if not perfect', () => {
    const r = raceState([...Array(9).fill({ score: 10 }), { score: 9 }, { score: 5 }], 99, 1);
    expect(r.result).toBe('vinto');
    expect(r.court).toBe(0);
    expect(r.played).toBe(10);
  });
  it('court wins at its target; later series are ignored', () => {
    const r = raceState([{ score: 9 }, { score: 9 }, { score: 9 }, { score: 10 }], 100, 2);
    expect(r).toMatchObject({ court: 2, result: 'perso', played: 2, balls: 18 });
  });
  it('a 0/10 series is still a point for the court', () => {
    expect(raceState([{ score: 0 }], 100, 1).result).toBe('perso');
  });
  it('stopped early = interrotto, otherwise in corso', () => {
    expect(raceState([{ score: 7 }], 100, 10).result).toBe('in_corso');
    expect(raceState([{ score: 7 }], 100, 10, true).result).toBe('interrotto');
  });
});

describe('raceOdds', () => {
  it('matches the reference simulation (binomial players, 100 vs 10)', () => {
    // From a 4000-match Monte Carlo: p=0.8 → ~19%, p=0.85 → ~62%, p=0.9 → ~94%
    expect(raceOdds(binom(0.8), 100, 10).win).toBeGreaterThan(0.15);
    expect(raceOdds(binom(0.8), 100, 10).win).toBeLessThan(0.24);
    expect(raceOdds(binom(0.85), 100, 10).win).toBeGreaterThan(0.56);
    expect(raceOdds(binom(0.85), 100, 10).win).toBeLessThan(0.68);
    expect(raceOdds(binom(0.9), 100, 10).win).toBeGreaterThan(0.9);
  });
  it('perfect player always wins in 10 series, hopeless player always loses', () => {
    const perfect = [...Array(10).fill(0), 1];
    expect(raceOdds(perfect, 100, 5)).toEqual({ win: 1, expectedSeries: 10 });
    const zero = [1, ...Array(10).fill(0)];
    expect(raceOdds(zero, 100, 5)).toEqual({ win: 0, expectedSeries: 5 });
  });
  it('expected length is around 11-12 series for a balanced 100 vs 10', () => {
    const e = raceOdds(binom(0.85), 100, 10).expectedSeries;
    expect(e).toBeGreaterThan(10);
    expect(e).toBeLessThan(14);
  });
  it('a higher court target always helps the player', () => {
    const d = binom(0.75);
    let prev = -1;
    for (let c = 2; c < 30; c++) {
      const w = raceOdds(d, 100, c).win;
      expect(w).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = w;
    }
  });
  it('odds from a mid-match position', () => {
    // 95 balls and the court one point from winning: balls are counted first, so any series of 5+ wins.
    const d = binom(0.5);
    const w = raceOdds(d, 100, 10, 95, 9).win;
    const pAtLeast5 = d.slice(5).reduce((a, b) => a + b, 0);
    expect(w).toBeCloseTo(pAtLeast5, 10);
  });
});

describe('balancedCourtTarget', () => {
  it('weaker players get a higher target (more help)', () => {
    const t6 = balancedCourtTarget(binom(0.6), 100);
    const t7 = balancedCourtTarget(binom(0.7), 100);
    const t9 = balancedCourtTarget(binom(0.9), 100);
    expect(t6).toBeGreaterThan(t7);
    expect(t7).toBeGreaterThan(t9);
    expect(t7).toBeGreaterThanOrEqual(13);
    expect(t7).toBeLessThanOrEqual(17);
  });
  it('gives odds close to 50%', () => {
    const d = distributionOf([10, 10, 8, 7, 9, 10, 6, 9, 10, 5]);
    const c = balancedCourtTarget(d!, 100);
    expect(Math.abs(raceOdds(d!, 100, c).win - 0.5)).toBeLessThan(0.2);
  });
});

describe('simulateGames', () => {
  const W = 10; // won point
  const L = 0;  // lost point
  it('4 straight points win a game', () => {
    const st = simulateGames([W, W, W, W], 8);
    expect(st.games).toEqual([1, 0]);
    expect(gameScoreLabel(st)).toBe('1-0');
  });
  it('deciding point at 40-40', () => {
    const st = simulateGames([W, W, W, L, L, L], 8);
    expect(gamePointsLabel(st)).toBe('40-40 punto decisivo');
    expect(simulateGames([W, W, W, L, L, L, L], 8).games).toEqual([0, 1]);
  });
  it('threshold decides the point', () => {
    expect(simulateGames([8], 8).points).toEqual([1, 0]);
    expect(simulateGames([7], 8).points).toEqual([0, 1]);
  });
  it('6-0 set after 24 won points, then a new set starts', () => {
    const st = simulateGames(Array(28).fill(W), 8);
    expect(st.sets).toEqual([[6, 0]]);
    expect(gameScoreLabel(st)).toBe('6-0 1-0');
  });
  it('tie-break at 6-6, won 7-5 → set 7-6', () => {
    const game = (w: boolean) => Array(4).fill(w ? W : L);
    const seq = [
      ...[0, 1, 2, 3, 4, 5].flatMap(() => [...game(true), ...game(false)]), // 6-6
      W, W, W, W, W, W, L, L, L, L, L, W, // 7-5 in the tie-break
    ];
    const st = simulateGames(seq, 8);
    expect(st.sets).toEqual([[7, 6]]);
    expect(st.tieBreak).toBe(false);
  });
  it('tie-break needs a 2-point margin', () => {
    const game = (w: boolean) => Array(4).fill(w ? W : L);
    const seq = [...[0, 1, 2, 3, 4, 5].flatMap(() => [...game(true), ...game(false)]), W, L, W, L, W, L, W, L, W, L, W, L, W];
    const st = simulateGames(seq, 8);
    expect(st.tieBreak).toBe(true);
    expect(gamePointsLabel(st)).toBe('tie-break 7-6');
  });
  it('7-5 set', () => {
    const game = (w: boolean) => Array(4).fill(w ? W : L);
    const seq = [...[0, 1, 2, 3, 4].flatMap(() => [...game(true), ...game(false)]), ...game(true), ...game(true)];
    expect(simulateGames(seq, 8).sets).toEqual([[7, 5]]);
  });
});

describe('seriesInPlayOrder', () => {
  it('orders module by module, then by series index', () => {
    const s: SeriesResult[] = [
      { testType: 'volley', seriesIndex: 0, score: 1 },
      { testType: 'groundstrokes', seriesIndex: 1, score: 2 },
      { testType: 'groundstrokes', seriesIndex: 0, score: 3 },
      { testType: 'serve', seriesIndex: 0, score: 4 },
    ];
    expect(seriesInPlayOrder(s)).toEqual([3, 2, 4, 1]);
  });
});

describe('stations and history', () => {
  it('series rotate through the chosen strokes', () => {
    expect(stationForSeries(['fh_cross', 'bh_cross'], 0).id).toBe('fh_cross');
    expect(stationForSeries(['fh_cross', 'bh_cross'], 3).id).toBe('bh_cross');
    expect(stationForSeries([], 0).id).toBe('fh_cross');
  });

  const test = (id: string, date: string, series: SeriesResult[]): TestSession => ({
    id, playerId: 'p', playerName: 'P', date, category: 'seconda', coach: '', completed: true, createdAt: date, series,
  });
  it('prefers series on the same strokes; groundstrokes count for the forehand/backhand cross', () => {
    const gs = Array.from({ length: 10 }, (_, i) => ({
      testType: 'groundstrokes' as const, seriesIndex: i, score: i % 2 ? 4 : 9, direction: (i % 2 ? 'bh_cross' : 'fh_cross') as 'fh_cross' | 'bh_cross',
    }));
    const vol = Array.from({ length: 10 }, (_, i) => ({ testType: 'volley' as const, seriesIndex: i, score: 2, direction: 'fh_volley' as const }));
    const h = playerHistory('p', ['fh_cross'], [test('a', '2026-01-01', [...gs, ...vol])], [], 60);
    // Only 5 forehand series: not enough (needs 8) → falls back to all strokes
    expect(h?.sameStrokes).toBe(false);
    const h2 = playerHistory('p', ['fh_cross', 'bh_cross'], [test('a', '2026-01-01', [...gs, ...vol])], [], 60);
    expect(h2?.sameStrokes).toBe(true);
    expect(h2?.scores).toHaveLength(10);
    expect(playerHistory('x', ['fh_cross'], [test('a', '2026-01-01', gs)], [])).toBeNull();
  });
  it('newest sources first and capped', () => {
    const mk = (score: number) => Array.from({ length: 10 }, (_, i) => ({ testType: 'forehand' as const, seriesIndex: i, score, direction: 'fh_cross' as const }));
    const h = playerHistory('p', ['fh_cross'], [test('old', '2025-01-01', mk(1)), test('new', '2026-01-01', mk(9))], [], 10);
    expect(h?.scores).toEqual(Array(10).fill(9));
  });
  it('suspended matches are not used, finished ones are', () => {
    const m = (result: MatchSession['result']): MatchSession => ({
      id: result, playerId: 'p', playerName: 'P', date: '2026-02-01', category: 'seconda', coach: '', playerTarget: 100,
      courtTarget: 10, targetMode: 'categoria', stations: ['fh_cross'], result, createdAt: '', updatedAt: '',
      series: Array.from({ length: 9 }, () => ({ station: 'fh_cross' as const, testType: 'forehand' as const, direction: 'fh_cross' as const, score: 7 })),
    });
    expect(playerHistory('p', ['fh_cross'], [], [m('in_corso')])).toBeNull();
    expect(playerHistory('p', ['fh_cross'], [], [m('perso')])?.scores).toHaveLength(9);
  });
});

describe('matchStats', () => {
  it('tracks pressure series (court within 2 points)', () => {
    const series = [9, 9, 10, 8].map(score => ({ station: 'fh_cross' as const, testType: 'forehand' as const, direction: 'fh_cross' as const, score }));
    const st = matchStats({ series, playerTarget: 100, courtTarget: 3, result: 'perso' });
    expect(st.race.result).toBe('perso');
    // before series 1: court 0 (3 left) → normal; series 2: 1 → 2 left → pressure; 3 and 4: pressure
    expect(st.timeline.map(t => t.pressure)).toEqual([false, true, true, true]);
    expect(st.bestPerfectStreak).toBe(1);
  });
  it('the winning series gives the court no point, also in the timeline', () => {
    const series = [10, 10, 9].map(score => ({ station: 'fh_cross' as const, testType: 'forehand' as const, direction: 'fh_cross' as const, score }));
    const st = matchStats({ series, playerTarget: 25, courtTarget: 5, result: 'vinto' });
    expect(st.timeline[2].court).toBe(0);
    expect(st.race.court).toBe(0);
  });
});

describe('settings', () => {
  it('older settings get the match defaults; bad values are replaced', () => {
    const s = normalizeSettings({ matchCourtTargets: { terza: 0, seconda: 13 } as never, matchGameThresholds: { prima: 11 } as never });
    expect(s.matchPlayerTarget).toBe(100);
    expect(s.matchCourtTargets).toEqual({ ...DEFAULT_SETTINGS.matchCourtTargets, seconda: 13 });
    expect(s.matchGameThresholds.prima).toBe(DEFAULT_SETTINGS.matchGameThresholds.prima);
  });
});
