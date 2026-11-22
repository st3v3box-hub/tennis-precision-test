import { describe, it, expect } from 'vitest';
import {
  PROTOCOL_ZONES, measuresAtDifficulty, difficultyOf, resolveSessionZones, zonesForLevel,
  clampMeasures, sameMeasures, countsForRankings, limitsFor,
} from '../src/lib/zones';
import { modulePasses, sessionPassed, singleStrokeSeries } from '../src/lib/protocol';
import { computeStrokeStats } from '../src/lib/formulas';
import { playerObjective } from '../src/lib/objectives';
import { normalizeSettings } from '../src/lib/storage';
import type { SeriesResult, TestSession } from '../src/types';

const D = PROTOCOL_ZONES;

describe('protocol zones', () => {
  it('match the slides: bigger distances = smaller groundstroke zone at higher levels', () => {
    expect(D.terza).toEqual({ gsFromCenter: 1, gsFromService: 1, volley: 1.5, serve: 2.06 });
    expect(D.seconda).toEqual({ gsFromCenter: 1.5, gsFromService: 2, volley: 1.2, serve: 1.2 });
    expect(D.prima).toEqual({ gsFromCenter: 2, gsFromService: 3, volley: 0.7, serve: 0.7 });
  });
});

describe('difficulty slider', () => {
  it('anchors 0/1/2 = 3ª/2ª/1ª', () => {
    expect(measuresAtDifficulty(0, D, 'terza')).toEqual(D.terza);
    expect(measuresAtDifficulty(1, D, 'seconda')).toEqual(D.seconda);
    expect(measuresAtDifficulty(2, D, 'prima')).toEqual(D.prima);
  });
  it('interpolates between anchors', () => {
    const m = measuresAtDifficulty(1.5, D, 'seconda');
    expect(m.gsFromCenter).toBeCloseTo(1.75, 6);
    expect(m.gsFromService).toBeCloseTo(2.5, 6);
  });
  it('extrapolates beyond 3ª and 1ª but stays on the court', () => {
    const easy = measuresAtDifficulty(-1, D, 'terza');
    expect(easy.gsFromCenter).toBeCloseTo(0.5, 6);
    expect(easy.gsFromService).toBeCloseTo(0, 6);
    const hard = measuresAtDifficulty(3, D, 'prima');
    expect(hard.gsFromService).toBeCloseTo(4, 6);
    expect(hard.volley).toBeGreaterThanOrEqual(limitsFor('prima').volley[0]);
  });
  it('difficultyOf inverts the slider', () => {
    for (const d of [0, 0.5, 1, 1.5, 2, 2.4]) {
      expect(difficultyOf(measuresAtDifficulty(d, D, 'terza'), D)).toBeCloseTo(d, 1);
    }
  });
  it('serve strips cannot exceed the box', () => {
    expect(clampMeasures({ ...D.seconda, serve: 3 }, 'seconda').serve).toBe(1.37);
    expect(clampMeasures({ ...D.terza, serve: 3 }, 'terza').serve).toBe(2.06);
  });
});

describe('session zones snapshot', () => {
  it('no choice = category defaults, standard', () => {
    expect(resolveSessionZones('seconda', undefined, D)).toEqual({ level: 'seconda', measures: D.seconda, standard: true });
  });
  it('another level is custom', () => {
    const z = resolveSessionZones('seconda', zonesForLevel('terza', D), D);
    expect(z.level).toBe('terza');
    expect(z.standard).toBe(false);
  });
  it('same level with edited measures is custom', () => {
    const z = resolveSessionZones('seconda', { level: 'seconda', measures: { ...D.seconda, volley: 1.4 } }, D);
    expect(z.standard).toBe(false);
  });
  it('U10 has no measures', () => {
    expect(resolveSessionZones('u10_u12', undefined, D)).toEqual({ level: 'u10_u12', measures: null, standard: true });
  });
  it('old tests without zones count as standard; custom only with the switch', () => {
    expect(countsForRankings({}, { includeCustomZones: false })).toBe(true);
    expect(countsForRankings({ zones: { level: 'terza', measures: D.terza, standard: false } }, { includeCustomZones: false })).toBe(false);
    expect(countsForRankings({ zones: { level: 'terza', measures: D.terza, standard: false } }, { includeCustomZones: true })).toBe(true);
    expect(sameMeasures(D.terza, { ...D.terza })).toBe(true);
  });
});

const gs = (fhScores: number[], bhScores: number[]): SeriesResult[] => {
  const out: SeriesResult[] = [];
  for (let i = 0; i < Math.max(fhScores.length, bhScores.length) * 2; i++) {
    const fh = i % 2 === 0;
    const sc = fh ? fhScores[i / 2] : bhScores[(i - 1) / 2];
    if (sc !== undefined) out.push({ testType: 'groundstrokes', seriesIndex: i, score: sc, direction: fh ? 'fh_cross' : 'bh_cross' });
  }
  return out;
};
const single = (module: 'forehand' | 'backhand', dir: 'cross' | 'line', scores: number[]): SeriesResult[] =>
  singleStrokeSeries(module, dir).slice(0, scores.length).map((s, i) => ({ testType: module, seriesIndex: s.seriesIndex, direction: s.direction, score: scores[i] }));

describe('single-stroke modules', () => {
  it('20 series with the chosen direction', () => {
    const s = singleStrokeSeries('forehand', 'line');
    expect(s).toHaveLength(20);
    expect(s.every(x => x.direction === 'fh_line' && x.testType === 'forehand')).toBe(true);
    expect(singleStrokeSeries('backhand', 'cross')[0].direction).toBe('bh_cross');
  });
  it('feed the forehand / backhand axis, cross and down-the-line averaged together', () => {
    const series = [...single('forehand', 'line', [6, 8]), ...single('backhand', 'cross', [4])];
    const st = computeStrokeStats({ series } as TestSession);
    expect(st.find(x => x.stroke === 'forehand')!.ave).toBe(7);
    expect(st.find(x => x.stroke === 'backhand')!.ave).toBe(4);
    expect(st.find(x => x.stroke === 'forehand')!.passThreshold).toBe(10);
  });
  it('pass rule: 10 perfect series out of max 20', () => {
    const passedEarly = single('forehand', 'cross', Array(10).fill(10));
    expect(modulePasses(passedEarly)[0]).toMatchObject({ played: 10, perfect: 10, passed: true });
    const failed = single('forehand', 'cross', [...Array(9).fill(10), ...Array(11).fill(9)]);
    expect(modulePasses(failed)[0]).toMatchObject({ played: 20, perfect: 9, passed: false });
  });
  it('groundstrokes alternating: 10 perfect in total between FH and BH', () => {
    expect(modulePasses(gs(Array(8).fill(10), [10, 10, 5]))[0].passed).toBe(true);
    expect(modulePasses(gs(Array(9).fill(10), [5]))[0].passed).toBe(false);
  });
  it('a session passes only when every module passes', () => {
    const series = [...single('forehand', 'cross', Array(10).fill(10)), ...single('backhand', 'cross', Array(20).fill(9))];
    expect(sessionPassed(series)).toBe(false);
    expect(sessionPassed([])).toBe(false);
  });
});

describe('objective needs passed tests', () => {
  const settings = normalizeSettings({}); // seconda objective 8.0 avg = 64% radar, 2 consecutive
  const sess = (id: string, date: string, series: SeriesResult[]): TestSession =>
    ({ id, playerId: 'p', playerName: 'p', date, category: 'seconda', coach: 'c', completed: true, createdAt: date, series });
  it('9/10 in every series: high average but never passed → not ready', () => {
    const nine = single('forehand', 'cross', Array(20).fill(9));
    const o = playerObjective([sess('a', '2026-01-01', nine), sess('b', '2026-02-01', nine)], settings);
    expect(o.latest).toBeCloseTo(81, 6);
    expect(o.streak).toBe(0);
    expect(o.status).not.toBe('pronto');
    expect(o.message).toMatch(/non è superato/);
  });
  it('custom-zone tests are ignored unless the switch is on', () => {
    const ten = single('forehand', 'cross', Array(10).fill(10));
    const custom = { ...sess('a', '2026-01-01', ten), zones: { level: 'terza' as const, measures: PROTOCOL_ZONES.terza, standard: false } };
    expect(playerObjective([custom], settings).status).toBe('nessun_dato');
    expect(playerObjective([custom], { ...settings, includeCustomZones: true }).latest).toBeCloseTo(100, 6);
  });
});
