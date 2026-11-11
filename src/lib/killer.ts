import type { KillerAttempt, KillerDepth, KillerSession, KillerZone } from '../types';

// ─── Protocol ────────────────────────────────────────────────────────────────

/** Ball order inside a run: 1 = forehand, 2 = backhand, 3 = forehand… */
export function strokeForBall(ballNumber: number): 'fh' | 'bh' {
  return ballNumber % 2 === 1 ? 'fh' : 'bh';
}

export const STROKE_LABEL = { fh: 'Dritto', bh: 'Rovescio' } as const;

export const ZONE_LABELS: Record<KillerZone, string> = {
  libera: 'Tutto il campo',
  pari_dispari: 'Dritto nella metà del pari, rovescio nella metà del dispari',
};

export const DEPTH_LABELS: Record<KillerDepth, string> = {
  libera: 'Qualsiasi profondità',
  oltre_servizio: 'Oltre la linea del servizio (no rettangolo del servizio)',
};

// ─── Metrics ─────────────────────────────────────────────────────────────────

export interface KillerBand {
  label: string;
  from: number;
  to: number;
  errors: number;
}

export interface KillerRun {
  n: number;
  balls: number;
  errorStroke: 'fh' | 'bh' | null;
}

export type KillerTrend = 'crescita' | 'calo' | 'stabile';

export interface KillerStats {
  completed: boolean;
  target: number;
  /** Number of starts (runs) */
  runs: number;
  errors: number;
  /** Every ball played, including the missed ones */
  totalBalls: number;
  /** target / totalBalls × 100 — only for completed tests (100 = no errors) */
  index: number | null;
  rating: string;
  bestStreak: number;
  /** Average / median good balls in runs that ended with an error */
  avgRunBeforeError: number;
  medianRunBeforeError: number;
  fhErrors: number;
  bhErrors: number;
  /** Where in the run errors happen (relative to the target) */
  bands: KillerBand[];
  firstHalfErrors: number;
  secondHalfErrors: number;
  /** Errors in the last 10% of the run, when the finish line is in sight */
  pressureErrors: number;
  /** Errors within the first balls (≤ max(5, 10% of target)) of a run that follows another error */
  relapses: number;
  /** relapses / runs that followed an error, 0–100 */
  relapseRate: number;
  /** Are runs getting longer over the test? null with fewer than 3 runs */
  trend: KillerTrend | null;
  playMs: number;
  pickupMs: number;
  totalMs: number;
  avgPickupMs: number;
  ballsPerMinute: number;
  finalRunMs: number;
  runList: KillerRun[];
}

export function killerRating(index: number | null, completed: boolean): string {
  if (!completed || index === null) return 'Non completato';
  if (index >= 90) return 'Killer';
  if (index >= 70) return 'Solido';
  if (index >= 50) return 'Costante';
  if (index >= 30) return 'Fragile';
  return 'Da costruire';
}

/** Error-position bands relative to the target: 0–10%, 10–25%, 25–50%, 50–75%, 75–100%. */
export function killerBands(target: number): Omit<KillerBand, 'errors'>[] {
  const bounds = [0.1, 0.25, 0.5, 0.75, 1];
  const bands: Omit<KillerBand, 'errors'>[] = [];
  let from = 1;
  for (const b of bounds) {
    const to = Math.max(from, Math.ceil(target * b));
    if (to >= from && (bands.length === 0 || to > bands[bands.length - 1].to)) {
      bands.push({ label: `${from}–${to}`, from, to });
      from = to + 1;
    }
    if (from > target) break;
  }
  return bands;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function trendOf(lengths: number[], target: number): KillerTrend | null {
  const n = lengths.length;
  if (n < 3) return null;
  const xMean = (n - 1) / 2;
  const yMean = lengths.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  lengths.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });
  const slopePerRun = den === 0 ? 0 : num / den;
  const relative = slopePerRun / Math.max(1, target); // share of the target gained per run
  if (relative > 0.05) return 'crescita';
  if (relative < -0.05) return 'calo';
  return 'stabile';
}

export function computeKillerStats(session: Pick<KillerSession, 'target' | 'completed' | 'attempts'>): KillerStats {
  const { target, completed, attempts } = session;
  const errorRuns = attempts.filter(a => a.errorStroke !== null);
  const errors = errorRuns.length;
  const totalBalls = attempts.reduce((sum, a) => sum + a.balls, 0) + errors;
  const index = completed && totalBalls > 0 ? (target / totalBalls) * 100 : null;

  const errorBall = (a: KillerAttempt) => a.balls + 1;
  const bands = killerBands(target).map(b => ({
    ...b,
    errors: errorRuns.filter(a => errorBall(a) >= b.from && errorBall(a) <= b.to).length,
  }));

  const relapseLimit = Math.max(5, Math.ceil(target * 0.1));
  let afterError = 0;
  let relapses = 0;
  attempts.forEach((a, i) => {
    if (i === 0 || attempts[i - 1].errorStroke === null) return;
    afterError++;
    if (a.errorStroke !== null && errorBall(a) <= relapseLimit) relapses++;
  });

  const playMs = attempts.reduce((s, a) => s + a.playMs, 0);
  const pickupMs = attempts.reduce((s, a) => s + a.pickupMs, 0);
  const pickups = attempts.filter(a => a.pickupMs > 0).length;
  const last = attempts[attempts.length - 1];

  return {
    completed,
    target,
    runs: attempts.length,
    errors,
    totalBalls,
    index,
    rating: killerRating(index, completed),
    bestStreak: attempts.reduce((m, a) => Math.max(m, a.balls), 0),
    avgRunBeforeError: errors ? errorRuns.reduce((s, a) => s + a.balls, 0) / errors : 0,
    medianRunBeforeError: median(errorRuns.map(a => a.balls)),
    fhErrors: errorRuns.filter(a => a.errorStroke === 'fh').length,
    bhErrors: errorRuns.filter(a => a.errorStroke === 'bh').length,
    bands,
    firstHalfErrors: errorRuns.filter(a => errorBall(a) <= target / 2).length,
    secondHalfErrors: errorRuns.filter(a => errorBall(a) > target / 2).length,
    pressureErrors: errorRuns.filter(a => errorBall(a) > target * 0.9).length,
    relapses,
    relapseRate: afterError ? (relapses / afterError) * 100 : 0,
    trend: trendOf(attempts.map(a => a.balls), target),
    playMs,
    pickupMs,
    totalMs: playMs + pickupMs,
    avgPickupMs: pickups ? pickupMs / pickups : 0,
    ballsPerMinute: playMs > 0 ? totalBalls / (playMs / 60000) : 0,
    finalRunMs: last ? last.playMs : 0,
    runList: attempts.map((a, i) => ({ n: i + 1, balls: a.balls, errorStroke: a.errorStroke })),
  };
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return h ? `${h}:${mm}:${String(s).padStart(2, '0')}` : `${mm}:${String(s).padStart(2, '0')}`;
}

// ─── Live test state machine ─────────────────────────────────────────────────

export type KillerPhase = 'playing' | 'pickup' | 'done';

export interface KillerLiveState {
  target: number;
  phase: KillerPhase;
  /** Good balls in the current run */
  count: number;
  /** Finished runs (the current run is added when it ends) */
  attempts: KillerAttempt[];
  /** When the current run started (ms timestamp) */
  runStartedAt: number;
  /** When the current pick-up started */
  pickupStartedAt: number | null;
  completed: boolean;
}

export type KillerAction =
  | { type: 'tap'; now: number }
  | { type: 'undo' }
  | { type: 'error'; ball: number; now: number }
  | { type: 'restart'; now: number }
  | { type: 'complete'; now: number }
  | { type: 'stop'; now: number };

export function startKiller(target: number, now: number): KillerLiveState {
  return { target, phase: 'playing', count: 0, attempts: [], runStartedAt: now, pickupStartedAt: null, completed: false };
}

/** Pure reducer: every transition of the live test. Invalid actions return the state unchanged. */
export function killerReducer(s: KillerLiveState, a: KillerAction): KillerLiveState {
  switch (a.type) {
    case 'tap': {
      if (s.phase !== 'playing') return s;
      const count = s.count + 1;
      if (count >= s.target) {
        return {
          ...s, count: s.target, phase: 'done', completed: true,
          attempts: [...s.attempts, { balls: s.target, errorStroke: null, playMs: a.now - s.runStartedAt, pickupMs: 0 }],
        };
      }
      return { ...s, count };
    }
    case 'undo':
      return s.phase === 'playing' && s.count > 0 ? { ...s, count: s.count - 1 } : s;
    case 'error': {
      if (s.phase !== 'playing') return s;
      const ball = Math.min(s.target, Math.max(1, Math.round(a.ball)));
      return {
        ...s, phase: 'pickup', count: 0, pickupStartedAt: a.now,
        attempts: [...s.attempts, { balls: ball - 1, errorStroke: strokeForBall(ball), playMs: a.now - s.runStartedAt, pickupMs: 0 }],
      };
    }
    case 'restart': {
      if (s.phase !== 'pickup' || s.pickupStartedAt === null) return s;
      const attempts = [...s.attempts];
      const last = attempts[attempts.length - 1];
      attempts[attempts.length - 1] = { ...last, pickupMs: a.now - s.pickupStartedAt };
      return { ...s, attempts, phase: 'playing', count: 0, runStartedAt: a.now, pickupStartedAt: null };
    }
    case 'complete': {
      // Coach confirms the full series was done (used when balls were not tapped one by one)
      if (s.phase !== 'playing') return s;
      return {
        ...s, count: s.target, phase: 'done', completed: true,
        attempts: [...s.attempts, { balls: s.target, errorStroke: null, playMs: a.now - s.runStartedAt, pickupMs: 0 }],
      };
    }
    case 'stop': {
      // Test ended early (time, fatigue…): keep what was played, not completed
      if (s.phase === 'done') return s;
      let attempts = [...s.attempts];
      if (s.phase === 'playing') {
        if (s.count > 0 || attempts.length === 0) {
          attempts = [...attempts, { balls: s.count, errorStroke: null, playMs: a.now - s.runStartedAt, pickupMs: 0 }];
        }
      } else if (s.pickupStartedAt !== null && attempts.length > 0) {
        const last = attempts[attempts.length - 1];
        attempts[attempts.length - 1] = { ...last, pickupMs: a.now - s.pickupStartedAt };
      }
      return { ...s, attempts, phase: 'done', completed: false, pickupStartedAt: null };
    }
  }
}

/** Live clock values for display */
export function killerClock(s: KillerLiveState, now: number): { playMs: number; pickupMs: number } {
  const done = s.attempts.reduce((acc, a) => ({ playMs: acc.playMs + a.playMs, pickupMs: acc.pickupMs + a.pickupMs }), { playMs: 0, pickupMs: 0 });
  if (s.phase === 'playing') done.playMs += Math.max(0, now - s.runStartedAt);
  if (s.phase === 'pickup' && s.pickupStartedAt !== null) done.pickupMs += Math.max(0, now - s.pickupStartedAt);
  return done;
}

// ─── Reading the numbers ─────────────────────────────────────────────────────

/** Plain-language observations for coach and parents, derived only from the data. */
export function killerInsights(st: KillerStats): string[] {
  const out: string[] = [];
  const pct = (n: number) => Math.round((n / Math.max(1, st.errors)) * 100);

  if (st.completed && st.errors === 0) {
    out.push(`Serie perfetta: ${st.target} palle senza errori al primo tentativo.`);
    return out;
  }
  if (st.errors >= 2) {
    const early = st.bands[0]?.errors ?? 0;
    if (early / st.errors >= 0.5) {
      out.push(`${pct(early)}% degli errori nelle prime ${st.bands[0].to} palle: fatica a entrare nel ritmo, tensione in partenza.`);
    }
    if (st.secondHalfErrors / st.errors >= 0.6) {
      out.push(`${pct(st.secondHalfErrors)}% degli errori nella seconda metà della serie: la concentrazione cala con la durata.`);
    }
  }
  if (st.pressureErrors > 0) {
    out.push(`${st.pressureErrors} ${st.pressureErrors === 1 ? 'errore' : 'errori'} a un passo dal traguardo (ultimo 10% della serie): tenuta sotto pressione da allenare.`);
  }
  if (st.errors >= 3) {
    if (st.bhErrors / st.errors >= 0.7) out.push(`${pct(st.bhErrors)}% degli errori di rovescio: è il colpo che cede per primo.`);
    else if (st.fhErrors / st.errors >= 0.7) out.push(`${pct(st.fhErrors)}% degli errori di dritto: è il colpo che cede per primo.`);
  }
  if (st.relapses >= 2 && st.relapseRate >= 50) {
    out.push(`Dopo un errore riparte spesso male (${Math.round(st.relapseRate)}% delle ripartenze cade subito): lavorare sulla gestione dell'errore.`);
  }
  if (st.trend === 'crescita') out.push('Le serie si allungano durante il test: reagisce agli errori e trova continuità.');
  if (st.trend === 'calo') out.push('Le serie si accorciano durante il test: fatica o frustrazione crescente.');
  if (!st.completed) out.push(`Test interrotto prima del traguardo: miglior serie ${st.bestStreak} su ${st.target}.`);
  return out;
}
