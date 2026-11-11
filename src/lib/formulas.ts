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
  combined: 'Combined',
  return: 'Return',
  backhand: 'Backhand',
  volley: 'Volley',
};

export function computeStrokeStats(
  session: TestSession,
  mode: StdDevMode = 'sample'
): StrokeStats[] {
  const { series } = session;

  const scores = (type: TestSession['series'][0]['testType'], dir?: string): number[] =>
    series
      .filter(s => s.testType === type && (dir === undefined || s.direction === dir))
      .sort((a, b) => a.seriesIndex - b.seriesIndex)
      .map(s => s.score);

  const make = (stroke: StrokeName, raw: number[]): StrokeStats => ({
    stroke,
    label: STROKE_LABELS[stroke],
    scores: raw,
    ave: mean(raw),
    dev: stdDev(raw, mode),
    perfectCount: raw.filter(s => s === 10).length,
    // Pass threshold: 50% of total series (e.g. 5/10, 3/6)
    passThreshold: Math.floor(raw.length / 2),
  });

  return [
    make('serve', scores('serve')),
    make('forehand', scores('groundstrokes', 'fh_cross')),
    make('combined', scores('combined')),
    make('return', scores('return')),
    make('backhand', scores('groundstrokes', 'bh_cross')),
    make('volley', scores('volley')),
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
  const values = stats.map(s => s.ave);

  // Partial tests: only strokes that actually have data count towards the %
  const testedValues = stats.filter(s => s.scores.length > 0).map(s => s.ave);
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
