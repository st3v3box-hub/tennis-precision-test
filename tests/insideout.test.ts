import { describe, it, expect } from 'vitest';
import { computeSessionResults, computeStrokeStats, radarStrokes, radarValuesFor, radarArea, familyAxes, familiesWithSpecials } from '../src/lib/formulas';
import { singleStrokeSeries, targetMirrored, moduleDisplayName, modulePasses, detectedDirection } from '../src/lib/protocol';
import type { SeriesResult, TestSession } from '../src/types';

const sess = (series: SeriesResult[]): TestSession =>
  ({ id: 's', playerId: 'p', playerName: 'p', date: '2026-01-01', category: 'seconda', coach: 'c', completed: true, createdAt: '2026-01-01', series });
const mod = (testType: SeriesResult['testType'], n: number, score: number, direction?: SeriesResult['direction']): SeriesResult[] =>
  Array.from({ length: n }, (_, i) => ({ testType, seriesIndex: i, score, direction }));
const io = (dir: 'cross' | 'line', scores: number[]): SeriesResult[] =>
  singleStrokeSeries('insideout', dir).slice(0, scores.length).map((s, i) => ({ testType: 'insideout', seriesIndex: s.seriesIndex, direction: s.direction, score: scores[i] }));

// A full old-style test (no sventaglio), different score per stroke
const full = (): SeriesResult[] => [
  ...Array.from({ length: 20 }, (_, i) => ({ testType: 'groundstrokes' as const, seriesIndex: i, score: i % 2 ? 6 : 8, direction: (i % 2 ? 'bh_cross' : 'fh_cross') as SeriesResult['direction'] })),
  ...mod('combined', 10, 7), ...mod('return', 10, 5), ...mod('serve', 6, 9), ...mod('volley', 10, 4),
];

describe('sventaglio (inside-out) module', () => {
  it('20 series, inside-out = io_cross, inside-in = io_line', () => {
    expect(singleStrokeSeries('insideout', 'cross')).toHaveLength(20);
    expect(singleStrokeSeries('insideout', 'cross')[0].direction).toBe('io_cross');
    expect(singleStrokeSeries('insideout', 'line')[0].direction).toBe('io_line');
    expect(detectedDirection(io('line', [5]), 'insideout')).toBe('line');
    expect(moduleDisplayName(io('cross', [5]), 'insideout')).toBe('Sventaglio di dritto inside-out');
  });
  it('target corner: inside-out = backhand corner (like FH down the line), inside-in = FH crosscourt corner', () => {
    expect(targetMirrored('insideout', 'cross')).toBe(targetMirrored('forehand', 'line'));
    expect(targetMirrored('insideout', 'cross')).toBe(targetMirrored('backhand', 'cross'));
    expect(targetMirrored('insideout', 'line')).toBe(targetMirrored('forehand', 'cross'));
  });
  it('passes with 10 perfect series out of 20', () => {
    expect(modulePasses(io('cross', Array(10).fill(10)))[0]).toMatchObject({ module: 'insideout', passed: true });
  });
});

describe('sventaglio and the radars', () => {
  it('old tests: same %, same 6 axes, same area as before', () => {
    const r = computeSessionResults(sess(full()));
    expect(r.radarValues).toHaveLength(6);
    // reference: radar formula over the 6 base strokes in the original order
    const base = [9, 8, 7, 5, 6, 4]; // serve, FH, combined, return, BH, volley
    const ref = base.reduce((s, v, i) => s + v * base[(i + 1) % 6], 0) / 6;
    expect(r.percentOfIdeal).toBeCloseTo(ref, 10);
    expect(r.radarArea).toBeCloseTo(radarArea(base), 10);
  });
  it('the general radar keeps the 6 base strokes; the sventaglio goes to the "fondo" family radar', () => {
    const r = computeSessionResults(sess([...full(), ...io('cross', Array(20).fill(7))]));
    expect(r.radarValues).toHaveLength(6);
    expect(radarStrokes(r.stats)).toEqual(['serve', 'forehand', 'combined', 'return', 'backhand', 'volley']);
    expect(familyAxes('fondo', r.stats)).toEqual(['forehand', 'insideout', 'backhand']);
    expect(familiesWithSpecials(r.stats)).toEqual(['fondo']);
  });
  it('family radar of a comparison: axes tested in either test (0 for the other)', () => {
    const a = computeStrokeStats(sess(full()));
    const b = computeStrokeStats(sess(io('cross', [8])));
    const axes = familyAxes('fondo', a, b);
    expect(axes).toContain('insideout');
    expect(radarValuesFor(a, axes)[axes.indexOf('insideout')]).toBe(0);
  });
  it('the sventaglio does not change the forehand axis', () => {
    const st = computeStrokeStats(sess([...full(), ...io('cross', Array(20).fill(2))]));
    expect(st.find(s => s.stroke === 'forehand')!.ave).toBe(8);
    expect(st.find(s => s.stroke === 'insideout')!.ave).toBe(2);
  });
});
