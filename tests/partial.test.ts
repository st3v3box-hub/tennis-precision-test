import { describe, it, expect } from 'vitest';
import { modulePasses, moduleDone, sessionInterrupted, sessionPartial, sessionScopeLabel, singleStrokeSeries } from '../src/lib/protocol';
import type { SeriesResult } from '../src/types';

const fh = (scores: number[]): SeriesResult[] =>
  singleStrokeSeries('forehand', 'cross').slice(0, scores.length).map((s, i) => ({ testType: 'forehand', seriesIndex: s.seriesIndex, direction: s.direction, score: scores[i] }));
const mod = (testType: SeriesResult['testType'], n: number, score: number): SeriesResult[] =>
  Array.from({ length: n }, (_, i) => ({ testType, seriesIndex: i, score }));

describe('module outcome', () => {
  it('superato when the perfect series are reached, even before the end', () => {
    expect(modulePasses(fh(Array(10).fill(10)))[0]).toMatchObject({ outcome: 'superato', complete: true });
  });
  it('non superato when all series were played without passing', () => {
    expect(modulePasses(fh(Array(20).fill(9)))[0]).toMatchObject({ outcome: 'non_superato', complete: true });
  });
  it('interrotto when stopped half-way (rain, darkness…)', () => {
    expect(modulePasses(fh([10, 9, 8, 10]))[0]).toMatchObject({ outcome: 'interrotto', complete: false, played: 4 });
    expect(sessionInterrupted(fh([10, 9]))).toBe(true);
    expect(moduleDone(fh([10, 9]), 'forehand')).toBe(false);
    expect(moduleDone(fh(Array(10).fill(10)), 'forehand')).toBe(true);
  });
});

describe('partial tests', () => {
  it('only solo dritto = partial', () => {
    const s = fh(Array(10).fill(10));
    expect(sessionPartial(s)).toBe(true);
    expect(sessionScopeLabel(s)).toBe('parziale · Solo dritto');
  });
  it('full protocol with solo dritto + solo rovescio is not partial', () => {
    const s: SeriesResult[] = [
      ...fh(Array(10).fill(10)), ...mod('backhand', 10, 10), ...mod('combined', 5, 10),
      ...mod('return', 5, 10), ...mod('serve', 3, 10), ...mod('volley', 5, 10),
    ];
    expect(sessionPartial(s)).toBe(false);
    expect(sessionScopeLabel(s)).toBeNull();
  });
  it('label combines partial and interrupted', () => {
    expect(sessionScopeLabel(fh([10, 5]))).toBe('parziale · Solo dritto · interrotto');
  });
});
