import type {
  StrokeStats,
  StrokeName,
  SessionResults,
  PrecisionTimePoint,
  TestSession,
  StdDevMode,
  PrecisionTimeStrategy,
  ScoreScale,
  AppSettings,
} from '../types';
import { MODULE_PASS, type Family } from './protocol';

// ─── Primitives ─────────────────────────────────────────────────────────────

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function stdDev(values: number[], mode: StdDevMode = 'sample'): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  const divisor = mode === 'sample' ? values.length - 1 : values.length;
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / divisor);
}

// ─── Radar area ──────────────────────────────────────────────────────────────

/**
 * Regular-polygon area for n=6 equi-angular axes.
 * Formula: A = 0.5 × Σ (r_i × r_{i+1} × sin(2π/6))
 */
export function radarArea(values: number[]): number {
  const n = values.length;
  const angle = (2 * Math.PI) / n;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += values[i] * values[j] * Math.sin(angle);
  }
  return 0.5 * area;
}

export const RADAR_N = 6;
export const IDEAL_RADAR_VALUES: number[] = Array(RADAR_N).fill(10);
export const IDEAL_AREA: number = radarArea(IDEAL_RADAR_VALUES);

/**
 * Radar-based % of ideal, generalised to any number of axes.
 *
 * For n ≥ 3 this equals radarArea(values) / radarArea(all 10s) × 100, because the
 * sin(2π/n) factor cancels: % = Σ r_i·r_{i+1} / n  (indices wrap around).
 * The same expression extends naturally to n = 1 (r²/100·100) and n = 2 (r1·r2),
 * so partial tests with 1–2 modules stay on the same (quadratic) scale as full ones:
 * all strokes at 7/10 → 49% whatever the number of modules.
 */
export function radarPercent(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += values[i] * values[(i + 1) % n];
  return sum / n;
}

/** Linear % of ideal: simple mean of stroke averages on a 0–100 scale (7/10 → 70%). */
export function linearPercent(values: number[]): number {
  return values.length === 0 ? 0 : (mean(values) / 10) * 100;
}

/** Kept for backward compatibility: radar % over the given values. */
export function percentOfIdeal(values: number[]): number {
  return radarPercent(values);
}

// ─── Stroke stats ────────────────────────────────────────────────────────────

const STROKE_LABELS: Record<StrokeName, string> = {
  serve: 'Servizio',
  forehand: 'Forehand',
  insideout: 'Sventaglio',
  combined: 'Combined',
  return: 'Return',
  backhand: 'Backhand',
  volley: 'Volley',
  slice: 'Back',
  putaway: 'Chiusura',
  approach: 'Attacco-volée',
  smash_volo: 'Smash al volo',
  smash_rimbalzo: 'Smash a rimbalzo',
  dropshot: 'Smorzata',
};

/** The 6 strokes of the general radar, in radar order. Same for every test, old and new. */
export const BASE_STROKES: StrokeName[] = ['serve', 'forehand', 'combined', 'return', 'backhand', 'volley'];
export const isBaseStroke = (s: StrokeName) => BASE_STROKES.includes(s);

/** Strokes of each family radar. Forehand and backhand also appear in the "fondo" radar. */
export const FAMILY_STROKES: Record<Family, StrokeName[]> = {
  fondo: ['forehand', 'insideout', 'putaway', 'slice', 'backhand'],
  servizio: ['serve', 'return'],
  rete: ['volley', 'approach', 'smash_volo', 'smash_rimbalzo'],
  sensibilita: ['dropshot'],
};

/** Family of a stroke (for colours): forehand and backhand belong to "fondo" */
export function strokeFamily(s: StrokeName): Family {
  return s === 'serve' || s === 'return' ? 'servizio' : s === 'combined' ? 'fondo'
    : (Object.keys(FAMILY_STROKES) as Family[]).find(f => FAMILY_STROKES[f].includes(s)) ?? 'fondo';
}

/** Strokes to list in tables: the 6 base strokes always, the special ones only when tested. */
export const visibleStats = (stats: StrokeStats[]) => stats.filter(s => isBaseStroke(s.stroke) || s.scores.length > 0);

export function computeStrokeStats(
  session: TestSession,
  mode: StdDevMode = 'sample'
): StrokeStats[] {
  const { series } = session;

  type S = TestSession['series'][0];
  const scores = (pred: (s: S) => boolean): number[] =>
    series
      .filter(pred)
      .sort((a, b) => a.testType.localeCompare(b.testType) || a.seriesIndex - b.seriesIndex)
      .map(s => s.score);

  // Perfect series needed for each stroke = half of the series foreseen by the protocol
  // (not of the series actually played: a module can stop early once passed).
  const make = (stroke: StrokeName, raw: number[], threshold: number): StrokeStats => ({
    stroke,
    label: STROKE_LABELS[stroke],
    scores: raw,
    ave: mean(raw),
    dev: stdDev(raw, mode),
    perfectCount: raw.filter(s => s === 10).length,
    passThreshold: threshold,
  });

  // Forehand / backhand axis = average of every series of that stroke:
  // alternating groundstrokes AND the single-stroke module (cross or down the line).
  const has = (t: S['testType']) => series.some(s => s.testType === t);
  const fhThreshold = has('forehand') ? MODULE_PASS.forehand : MODULE_PASS.groundstrokes / 2;
  const bhThreshold = has('backhand') ? MODULE_PASS.backhand : MODULE_PASS.groundstrokes / 2;

  return [
    make('serve', scores(s => s.testType === 'serve'), MODULE_PASS.serve),
    make('forehand', scores(s => s.testType === 'forehand' || (s.testType === 'groundstrokes' && s.direction === 'fh_cross')), fhThreshold),
    make('insideout', scores(s => s.testType === 'insideout'), MODULE_PASS.insideout),
    make('combined', scores(s => s.testType === 'combined'), MODULE_PASS.combined),
    make('return', scores(s => s.testType === 'return'), MODULE_PASS.return),
    make('backhand', scores(s => s.testType === 'backhand' || (s.testType === 'groundstrokes' && s.direction === 'bh_cross')), bhThreshold),
    make('volley', scores(s => s.testType === 'volley'), MODULE_PASS.volley),
    // Special strokes: shown and counted only when tested
    make('slice', scores(s => s.testType === 'slice'), MODULE_PASS.slice),
    make('putaway', scores(s => s.testType === 'putaway'), MODULE_PASS.putaway),
    make('approach', scores(s => s.testType === 'approach'), MODULE_PASS.approach),
    make('smash_volo', scores(s => s.testType === 'smash_volo'), MODULE_PASS.smash_volo),
    make('smash_rimbalzo', scores(s => s.testType === 'smash_rimbalzo'), MODULE_PASS.smash_rimbalzo),
    make('dropshot', scores(s => s.testType === 'dropshot'), MODULE_PASS.dropshot),
  ];
}

// ─── Precision–Time ──────────────────────────────────────────────────────────

/**
 * Strategy A (default): one point per series index i (max 10)
 *   point_i = mean(FH_i, BH_i, Combined_i)
 *
 * Strategy B: one point per PAIR of consecutive series (max 5)
 *   point_k = mean( avg(FH_2k, FH_2k+1), avg(BH_2k, BH_2k+1), avg(C_2k, C_2k+1) )
 *   Smoother curve; each series is used exactly once.
 */
export function computePrecisionTime(
  session: TestSession,
  strategy: PrecisionTimeStrategy = 'A'
): PrecisionTimePoint[] {
  const { series } = session;

  const byIndex = (pred: (s: TestSession['series'][0]) => boolean) =>
    series.filter(pred).sort((a, b) => a.seriesIndex - b.seriesIndex).map(s => s.score);

  const fh = byIndex(s => s.testType === 'groundstrokes' && s.direction === 'fh_cross');
  const bh = byIndex(s => s.testType === 'groundstrokes' && s.direction === 'bh_cross');
  const comb = byIndex(s => s.testType === 'combined');

  const point = (index: number, fhVal: number, bhVal: number, combinedVal: number): PrecisionTimePoint => ({
    index,
    fh: fhVal,
    bh: bhVal,
    combined: combinedVal,
    mean: mean([fhVal, bhVal, combinedVal]),
  });

  const points: PrecisionTimePoint[] = [];

  if (strategy === 'B') {
    const pairs = Math.min(
      Math.floor(fh.length / 2),
      Math.floor(bh.length / 2),
      Math.floor(comb.length / 2),
      5
    );
    for (let k = 0; k < pairs; k++) {
      points.push(point(
        k + 1,
        mean([fh[2 * k], fh[2 * k + 1]]),
        mean([bh[2 * k], bh[2 * k + 1]]),
        mean([comb[2 * k], comb[2 * k + 1]])
      ));
    }
    return points;
  }

  const len = Math.min(fh.length, bh.length, comb.length, 10);
  for (let i = 0; i < len; i++) points.push(point(i + 1, fh[i], bh[i], comb[i]));
  return points;
}

// ─── Full session results ────────────────────────────────────────────────────

/** Axes of the general radar: always the 6 base strokes (the special ones have their family radars) */
export function radarStrokes(..._lists: (StrokeStats[] | undefined)[]): StrokeName[] {
  return BASE_STROKES;
}

/** Axes of a family radar: the family strokes tested in at least one of the lists */
export function familyAxes(family: Family, ...lists: (StrokeStats[] | undefined)[]): StrokeName[] {
  return FAMILY_STROKES[family].filter(st => lists.some(l => l?.some(s => s.stroke === st && s.scores.length > 0)));
}

/** Families worth their own chart: at least one special stroke tested (fondo/rete/sensibilità) */
export function familiesWithSpecials(...lists: (StrokeStats[] | undefined)[]): Family[] {
  return (['fondo', 'rete', 'sensibilita'] as Family[]).filter(f =>
    FAMILY_STROKES[f].some(st => !isBaseStroke(st) && lists.some(l => l?.some(s => s.stroke === st && s.scores.length > 0))));
}

/** Values of one stats list on the given axes (0 for missing) */
export function radarValuesFor(stats: StrokeStats[] | undefined, axes: StrokeName[]): number[] {
  return axes.map(a => stats?.find(s => s.stroke === a)?.ave ?? 0);
}

export const strokeLabel = (s: StrokeName) => STROKE_LABELS[s];

export type ResultOptions = Partial<Pick<AppSettings, 'stdDevMode' | 'precisionTimeStrategy' | 'scoreScale'>>;

/**
 * Computes all results for a session. Pass the app settings object so every
 * screen (and the CSV export) uses the same formulas.
 */
export function computeSessionResults(
  session: TestSession,
  options: ResultOptions = {}
): SessionResults {
  const mode: StdDevMode = options.stdDevMode ?? 'sample';
  const ptStrategy: PrecisionTimeStrategy = options.precisionTimeStrategy ?? 'A';
  const scale: ScoreScale = options.scoreScale ?? 'radar';

  const stats = computeStrokeStats(session, mode);
  // General radar: the 6 base strokes
  const values = radarValuesFor(stats, BASE_STROKES);

  // % ideale on every stroke actually tested (base ones in radar order, then the special ones):
  // tests with only base strokes give exactly the same value as before.
  const ordered = [...BASE_STROKES.map(b => stats.find(s => s.stroke === b)!), ...stats.filter(s => !isBaseStroke(s.stroke))];
  const testedValues = ordered.filter(s => s.scores.length > 0).map(s => s.ave);
  const poi = scale === 'linear' ? linearPercent(testedValues) : radarPercent(testedValues);

  return {
    session,
    stats,
    radarValues: values,
    radarArea: radarArea(values),
    percentOfIdeal: poi,
    precisionTime: computePrecisionTime(session, ptStrategy),
  };
}
