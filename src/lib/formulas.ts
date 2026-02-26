import type {
  StrokeStats,
  StrokeName,
  SessionResults,
  PrecisionTimePoint,
  TestSession,
  StdDevMode,
  PrecisionTimeStrategy,
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

export function percentOfIdeal(values: number[]): number {
  const ideal = IDEAL_AREA;
  if (ideal === 0) return 0;
  return (radarArea(values) / ideal) * 100;
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
 * Strategy A (default): For i=0..9:
 *   fh = i-th FH series from groundstrokes
 *   bh = i-th BH series from groundstrokes
 *   combined = i-th combined series
 *   mean(fh, bh, combined)
 *
 * Strategy B: Same data but fh/bh pair represents 2 consecutive groundstroke
 *   series averaged together then combined with combined_i.
 */
export function computePrecisionTime(
  session: TestSession,
  strategy: PrecisionTimeStrategy = 'A'
): PrecisionTimePoint[] {
  const { series } = session;

  const fhSeries = series
    .filter(s => s.testType === 'groundstrokes' && s.direction === 'fh_cross')
    .sort((a, b) => a.seriesIndex - b.seriesIndex);
  const bhSeries = series
    .filter(s => s.testType === 'groundstrokes' && s.direction === 'bh_cross')
    .sort((a, b) => a.seriesIndex - b.seriesIndex);
  const combSeries = series
    .filter(s => s.testType === 'combined')
    .sort((a, b) => a.seriesIndex - b.seriesIndex);

  const len = Math.min(fhSeries.length, bhSeries.length, combSeries.length, 10);
  const points: PrecisionTimePoint[] = [];

  for (let i = 0; i < len; i++) {
    let fhVal: number;
    let bhVal: number;

    if (strategy === 'B' && i < Math.floor(fhSeries.length / 2)) {
      // Strategy B: pair consecutive FH series → one data point
      fhVal = mean([fhSeries[i * 2]?.score ?? 0, fhSeries[i * 2 + 1]?.score ?? 0]);
      bhVal = mean([bhSeries[i * 2]?.score ?? 0, bhSeries[i * 2 + 1]?.score ?? 0]);
    } else {
      fhVal = fhSeries[i]?.score ?? 0;
      bhVal = bhSeries[i]?.score ?? 0;
    }

    const combinedVal = combSeries[i]?.score ?? 0;
    points.push({
      index: i + 1,
      fh: fhVal,
      bh: bhVal,
      combined: combinedVal,
      mean: mean([fhVal, bhVal, combinedVal]),
    });
  }

  return points;
}

// ─── Full session results ────────────────────────────────────────────────────

export function computeSessionResults(
  session: TestSession,
  mode: StdDevMode = 'sample',
  ptStrategy: PrecisionTimeStrategy = 'A'
): SessionResults {
  const stats = computeStrokeStats(session, mode);
  const values = stats.map(s => s.ave);
  return {
    session,
    stats,
    radarValues: values,
    radarArea: radarArea(values),
    percentOfIdeal: percentOfIdeal(values),
    precisionTime: computePrecisionTime(session, ptStrategy),
  };
}
