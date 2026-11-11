import { describe, it, expect } from 'vitest';
import { targetPercent, playerObjective, compareWithGroup, nextCategory } from '../src/lib/objectives';
import { normalizeSettings } from '../src/lib/storage';
import type { Category, SeriesResult, TestSession } from '../src/types';

const settings = normalizeSettings({}); // defaults: seconda 8.0, 2 consecutive, radar

/** Session with every module at the same score */
const sess = (id: string, playerId: string, date: string, score: number, category: Category = 'seconda', completed = true): TestSession => {
  const series: SeriesResult[] = [];
  for (let i = 0; i < 20; i++) series.push({ testType: 'groundstrokes', seriesIndex: i, score, direction: i % 2 ? 'bh_cross' : 'fh_cross' });
  for (const t of ['combined', 'return', 'serve', 'volley'] as const) for (let i = 0; i < 6; i++) series.push({ testType: t, seriesIndex: i, score });
  return { id, playerId, playerName: playerId, date, category, coach: 'c', completed, createdAt: date, series };
};

describe('targetPercent', () => {
  it('radar is quadratic, linear is proportional', () => {
    expect(targetPercent(8, 'radar')).toBeCloseTo(64, 6);
    expect(targetPercent(8, 'linear')).toBeCloseTo(80, 6);
    expect(targetPercent(12, 'linear')).toBe(100);
  });
});

describe('nextCategory', () => {
  it('follows u10 → 3ª → 2ª → 1ª', () => {
    expect(nextCategory('u10_u12')).toBe('terza');
    expect(nextCategory('seconda')).toBe('prima');
    expect(nextCategory('prima')).toBeNull();
  });
});

describe('playerObjective', () => {
  it('no data', () => {
    expect(playerObjective([], settings).status).toBe('nessun_dato');
  });
  it('pronto after the required consecutive tests above target', () => {
    const o = playerObjective([sess('a', 'p', '2026-01-01', 7), sess('b', 'p', '2026-02-01', 8), sess('c', 'p', '2026-03-01', 9)], settings);
    expect(o.target).toBeCloseTo(64, 6);
    expect(o.streak).toBe(2);
    expect(o.status).toBe('pronto');
    expect(o.next).toBe('prima');
  });
  it('one test above target is not enough when 2 are required', () => {
    const o = playerObjective([sess('a', 'p', '2026-01-01', 7), sess('b', 'p', '2026-02-01', 9)], settings);
    expect(o.status).toBe('in_corsa');
    expect(o.gap).toBe(0);
  });
  it('fermo when 3 tests do not improve and stay below target', () => {
    const o = playerObjective([sess('a', 'p', '2026-01-01', 6), sess('b', 'p', '2026-02-01', 6), sess('c', 'p', '2026-03-01', 6)], settings);
    expect(o.status).toBe('fermo');
    expect(o.gap).toBeCloseTo(28, 6);
  });
  it('uses only the category of the latest test and ignores drafts', () => {
    const o = playerObjective([sess('a', 'p', '2026-01-01', 9, 'terza'), sess('b', 'p', '2026-02-01', 5, 'seconda'), sess('c', 'p', '2026-03-01', 10, 'seconda', false)], settings);
    expect(o.category).toBe('seconda');
    expect(o.testsInCategory).toBe(1);
  });
});

describe('compareWithGroup', () => {
  const others = [sess('o1', 'x1', '2026-01-01', 5), sess('o2', 'x2', '2026-01-01', 6), sess('o3', 'x3', '2026-01-01', 7), sess('o4', 'x4', '2026-01-01', 9)];
  it('null when fewer than 3 other players', () => {
    expect(compareWithGroup(sess('m', 'me', '2026-02-01', 8), others.slice(0, 2))).toBeNull();
  });
  it('percentile vs other players of the same category, latest test each', () => {
    const older = sess('o1old', 'x1', '2025-01-01', 10); // older test of x1 must be ignored
    const r = compareWithGroup(sess('m', 'me', '2026-02-01', 8), [...others, older])!;
    expect(r.groupSize).toBe(4);
    expect(r.strokes).toHaveLength(6);
    expect(r.strokes[0].percentile).toBe(75); // better than 5,6,7 — worse than 9
    expect(r.strokes[0].groupMean).toBeCloseTo(6.75, 6);
  });
  it('ignores other categories and the player own tests', () => {
    const mixed = [...others.slice(0, 2), sess('t', 'x9', '2026-01-01', 9, 'terza'), sess('mine-old', 'me', '2026-01-01', 1)];
    expect(compareWithGroup(sess('m', 'me', '2026-02-01', 8), mixed)).toBeNull();
  });
});
