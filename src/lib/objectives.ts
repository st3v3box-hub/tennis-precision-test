import type { AppSettings, Category, ScoreScale, StrokeName, TestSession } from '../types';
import { computeSessionResults, type ResultOptions } from './formulas';
import { CATEGORY_TARGETS } from './protocol';

/** Progression order: each category's objective unlocks the next one. */
export const CATEGORY_ORDER: Category[] = ['u10_u12', 'terza', 'seconda', 'prima'];

/** Converts an average score (0–10, same on every stroke) into the % shown by the chosen scale. */
export function targetPercent(avgScore: number, scale: ScoreScale): number {
  const r = Math.max(0, Math.min(10, avgScore)) / 10;
  return scale === 'linear' ? r * 100 : r * r * 100;
}

export function nextCategory(c: Category): Category | null {
  const i = CATEGORY_ORDER.indexOf(c);
  return i >= 0 && i < CATEGORY_ORDER.length - 1 ? CATEGORY_ORDER[i + 1] : null;
}

export type ObjectiveStatus = 'pronto' | 'in_corsa' | 'fermo' | 'nessun_dato';

export interface PlayerObjective {
  status: ObjectiveStatus;
  category: Category | null;
  next: Category | null;
  /** Objective in % (chosen scale) */
  target: number;
  latest: number | null;
  best: number | null;
  /** Points still missing from the latest test to the objective (0 if reached) */
  gap: number;
  /** Consecutive most recent tests at or above the objective */
  streak: number;
  required: number;
  testsInCategory: number;
  /** Short sentence for the UI and the parent report */
  message: string;
}

const byDate = (a: TestSession, b: TestSession) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt);

/**
 * Where the player stands against the objective of their current category
 * (the category of their most recent completed test).
 */
export function playerObjective(sessions: TestSession[], settings: AppSettings): PlayerObjective {
  const done = sessions.filter(s => s.completed).sort(byDate);
  const opts: ResultOptions = settings;
  const required = Math.max(1, settings.promotionConsecutive);
  if (done.length === 0) {
    return {
      status: 'nessun_dato', category: null, next: null, target: 0, latest: null, best: null,
      gap: 0, streak: 0, required, testsInCategory: 0, message: 'Nessun test completato.',
    };
  }
  const category = done[done.length - 1].category;
  const inCat = done.filter(s => s.category === category);
  const pcts = inCat.map(s => computeSessionResults(s, opts).percentOfIdeal);
  const target = targetPercent(settings.promotionTargets[category], settings.scoreScale);
  const latest = pcts[pcts.length - 1];
  const best = Math.max(...pcts);

  // Tolerance: exactly reaching the objective must count (8.0 avg → 64% vs 64.00000000000001)
  const EPS = 1e-6;
  const reached = (v: number) => v >= target - EPS;
  let streak = 0;
  for (let i = pcts.length - 1; i >= 0 && reached(pcts[i]); i--) streak++;

  const last3 = pcts.slice(-3);
  const stalled = last3.length === 3 && !reached(latest) && last3[2] - last3[0] <= 1;

  const status: ObjectiveStatus = streak >= required ? 'pronto' : stalled ? 'fermo' : 'in_corsa';
  const next = nextCategory(category);
  const catLabel = CATEGORY_TARGETS[category].label;
  const nextLabel = next ? CATEGORY_TARGETS[next].label : null;
  const gap = reached(latest) ? 0 : target - latest;

  let message: string;
  if (status === 'pronto') {
    message = nextLabel
      ? `Obiettivo ${catLabel} raggiunto in ${streak} test di fila: pronto per la ${nextLabel}.`
      : `Obiettivo ${catLabel} raggiunto in ${streak} test di fila.`;
  } else if (status === 'fermo') {
    message = `Fermo da 3 test in ${catLabel}: mancano ${gap.toFixed(0)} punti all'obiettivo.`;
  } else if (gap === 0) {
    message = `Obiettivo ${catLabel} raggiunto nell'ultimo test (${streak}/${required} di fila richiesti).`;
  } else {
    message = `Mancano ${gap.toFixed(0)} punti all'obiettivo ${catLabel} (${target.toFixed(0)}%).`;
  }

  return { status, category, next, target, latest, best, gap, streak, required, testsInCategory: inCat.length, message };
}

// ─── Comparison with the group ───────────────────────────────────────────────

export interface StrokeComparison {
  stroke: StrokeName;
  label: string;
  value: number;
  /** Share of the group the player is better than (0–100), ties count half */
  percentile: number;
  groupMean: number;
  groupSize: number;
}

export interface GroupComparison {
  category: Category;
  groupSize: number;
  overall: { value: number; percentile: number; groupMean: number } | null;
  strokes: StrokeComparison[];
}

/** Minimum other players in the category for a meaningful comparison */
export const MIN_GROUP = 3;

function percentileOf(value: number, others: number[]): number {
  if (others.length === 0) return 0;
  const below = others.filter(v => v < value).length;
  const equal = others.filter(v => v === value).length;
  return ((below + equal / 2) / others.length) * 100;
}

/**
 * Compares a session with the latest completed session of every OTHER player in the
 * same category, stroke by stroke. Returns null when the group is too small.
 */
export function compareWithGroup(session: TestSession, all: TestSession[], opts: ResultOptions = {}): GroupComparison | null {
  const latestByPlayer = new Map<string, TestSession>();
  for (const s of all) {
    if (!s.completed || s.category !== session.category || s.playerId === session.playerId) continue;
    const cur = latestByPlayer.get(s.playerId);
    if (!cur || byDate(cur, s) < 0) latestByPlayer.set(s.playerId, s);
  }
  const group = [...latestByPlayer.values()].map(s => computeSessionResults(s, opts));
  if (group.length < MIN_GROUP) return null;

  const mine = computeSessionResults(session, opts);
  const strokes: StrokeComparison[] = [];
  for (const st of mine.stats) {
    if (st.scores.length === 0) continue;
    const others = group
      .map(r => r.stats.find(x => x.stroke === st.stroke))
      .filter((x): x is NonNullable<typeof x> => !!x && x.scores.length > 0)
      .map(x => x.ave);
    if (others.length < MIN_GROUP) continue;
    strokes.push({
      stroke: st.stroke,
      label: st.label,
      value: st.ave,
      percentile: percentileOf(st.ave, others),
      groupMean: others.reduce((a, b) => a + b, 0) / others.length,
      groupSize: others.length,
    });
  }
  const overallOthers = group.map(r => r.percentOfIdeal);
  return {
    category: session.category,
    groupSize: group.length,
    overall: {
      value: mine.percentOfIdeal,
      percentile: percentileOf(mine.percentOfIdeal, overallOthers),
      groupMean: overallOthers.reduce((a, b) => a + b, 0) / overallOthers.length,
    },
    strokes,
  };
}
