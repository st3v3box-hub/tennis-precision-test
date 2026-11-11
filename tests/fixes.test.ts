import { describe, it, expect } from 'vitest';
import {
  radarArea,
  radarPercent,
  linearPercent,
  computeSessionResults,
  computePrecisionTime,
} from '../src/lib/formulas';
import type { SeriesResult, TestSession, TestType } from '../src/types';

const session = (series: SeriesResult[]): TestSession => ({
  id: 's', playerId: 'p', playerName: 'P', date: '2026-01-01', category: 'seconda',
  coach: 'C', completed: true, createdAt: '2026-01-01', series,
});

/** Builds a session where every listed module has all its series at the same score. */
const uniform = (modules: TestType[], score: number): TestSession => {
  const series: SeriesResult[] = [];
  for (const m of modules) {
    if (m === 'groundstrokes') {
      for (let i = 0; i < 20; i++) series.push({ testType: m, seriesIndex: i, score, direction: i % 2 ? 'bh_cross' : 'fh_cross' });
    } else {
      for (let i = 0; i < 6; i++) series.push({ testType: m, seriesIndex: i, score });
    }
  }
  return session(series);
};

describe('radarPercent', () => {
  it('matches area/idealArea for 3–6 axes', () => {
    const cases = [[7, 5, 9], [3, 8, 6, 10], [10, 2, 7, 7, 4], [8, 7, 5, 4, 6, 9]];
    for (const v of cases) {
      const expected = (radarArea(v) / radarArea(v.map(() => 10))) * 100;
      expect(radarPercent(v)).toBeCloseTo(expected, 10);
    }
  });
  it('handles empty input', () => expect(radarPercent([])).toBe(0));
  it('stays bounded 0–100', () => {
    expect(radarPercent([10])).toBe(100);
    expect(radarPercent([10, 10])).toBe(100);
    expect(radarPercent([0, 10])).toBe(0);
  });
});

describe('% ideale coerente tra test completi e parziali', () => {
  const sets: TestType[][] = [
    ['serve'],
    ['serve', 'return'],
    ['serve', 'return', 'volley'],
    ['groundstrokes', 'combined', 'return', 'serve', 'volley'],
  ];

  it('radar: stesso livello (7/10) → stesso 49% con 1, 2, 3 o tutti i moduli', () => {
    for (const mods of sets) {
      expect(computeSessionResults(uniform(mods, 7)).percentOfIdeal).toBeCloseTo(49, 6);
    }
  });

  it('lineare: stesso livello (7/10) → 70% con qualsiasi numero di moduli', () => {
    for (const mods of sets) {
      expect(computeSessionResults(uniform(mods, 7), { scoreScale: 'linear' }).percentOfIdeal).toBeCloseTo(70, 6);
    }
  });

  it('linearPercent is the plain mean on 0–100', () => {
    expect(linearPercent([6, 8])).toBe(70);
    expect(linearPercent([])).toBe(0);
  });

  it('nessun modulo → 0%', () => {
    expect(computeSessionResults(session([])).percentOfIdeal).toBe(0);
  });
});

describe('Precision–Time strategia B', () => {
  // FH and BH: first half 2, second half 8. Combined: 1..10 by index.
  const series: SeriesResult[] = [];
  for (let i = 0; i < 20; i++) {
    series.push({ testType: 'groundstrokes', seriesIndex: i, direction: i % 2 ? 'bh_cross' : 'fh_cross', score: i < 10 ? 2 : 8 });
  }
  for (let i = 0; i < 10; i++) series.push({ testType: 'combined', seriesIndex: i, score: i + 1 });
  const s = session(series);

  it('produce 5 punti, uno per coppia di serie', () => {
    expect(computePrecisionTime(s, 'B')).toHaveLength(5);
  });

  it('usa ogni serie una sola volta (niente dati duplicati)', () => {
    const pts = computePrecisionTime(s, 'B');
    expect(pts.map(p => p.fh)).toEqual([2, 2, 5, 8, 8]);
    expect(pts.map(p => p.combined)).toEqual([1.5, 3.5, 5.5, 7.5, 9.5]);
    // FH appears 10 times in the session → the 5 pair-averages must sum to half the FH total
    const fhTotal = series.filter(x => x.direction === 'fh_cross').reduce((a, x) => a + x.score, 0);
    expect(pts.reduce((a, p) => a + p.fh, 0)).toBeCloseTo(fhTotal / 2, 10);
  });

  it('con serie dispari ignora solo l\'ultima incompleta', () => {
    const partial = session(series.filter(x => !(x.testType === 'combined' && x.seriesIndex >= 7)));
    expect(computePrecisionTime(partial, 'B')).toHaveLength(3);
  });

  it('strategia A resta a 10 punti', () => {
    expect(computePrecisionTime(s, 'A')).toHaveLength(10);
  });
});
