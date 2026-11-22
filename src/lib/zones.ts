import type { AppSettings, Category, SessionZones, TestSession, ZoneCategory, ZoneMeasures } from '../types';

// ─── Court geometry (metres, ITF) ────────────────────────────────────────────

export const COURT = {
  /** Singles half width (centre line → singles sideline) */
  halfWidth: 4.115,
  /** Service line → baseline */
  backDepth: 5.485,
  /** Net → service line */
  serviceDepth: 6.4,
  /** Width of one service box */
  boxWidth: 4.115,
};

/** Zone measures from the protocol slides ("Accuracy test") */
export const PROTOCOL_ZONES: Record<ZoneCategory, ZoneMeasures> = {
  terza: { gsFromCenter: 1, gsFromService: 1, volley: 1.5, serve: 2.06 },
  seconda: { gsFromCenter: 1.5, gsFromService: 2, volley: 1.2, serve: 1.2 },
  prima: { gsFromCenter: 2, gsFromService: 3, volley: 0.7, serve: 0.7 },
};

export const ZONE_CATEGORIES: ZoneCategory[] = ['terza', 'seconda', 'prima'];

/** Number of serve target strips per level (3ª uses two halves of the box) */
export function serveStripsFor(level: Category): number {
  return level === 'terza' ? 2 : 3;
}

/** Physical limits so a zone always exists on the court */
export function limitsFor(level: Category): Record<keyof ZoneMeasures, [number, number]> {
  return {
    gsFromCenter: [0, 3.6],
    gsFromService: [0, 5],
    volley: [0.3, 4],
    // 4.115 / 2 = 2.0575 → 2.06 as in the slides
    serve: [0.3, Math.round((COURT.boxWidth / serveStripsFor(level)) * 100) / 100],
  };
}

const FIELDS: (keyof ZoneMeasures)[] = ['gsFromCenter', 'gsFromService', 'volley', 'serve'];

const round = (v: number) => Math.round(v * 100) / 100;
const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));

export function clampMeasures(m: ZoneMeasures, level: Category): ZoneMeasures {
  const lim = limitsFor(level);
  const out = { ...m };
  for (const f of FIELDS) out[f] = round(clamp(Number.isFinite(m[f]) ? m[f] : 0, lim[f]));
  return out;
}

export function sameMeasures(a: ZoneMeasures | null | undefined, b: ZoneMeasures | null | undefined): boolean {
  if (!a || !b) return a === b;
  return FIELDS.every(f => Math.abs(a[f] - b[f]) < 0.005);
}

// ─── Difficulty slider ───────────────────────────────────────────────────────
// Position 0 = 3ª, 1 = 2ª, 2 = 1ª; below 0 easier than 3ª, above 2 harder than 1ª.
// Values between anchors are interpolated, outside they are extrapolated from the
// nearest segment and clamped to the court limits.

export const DIFFICULTY_MIN = -1;
export const DIFFICULTY_MAX = 3;

function anchorsFor(defaults: Record<ZoneCategory, ZoneMeasures>): ZoneMeasures[] {
  return [defaults.terza, defaults.seconda, defaults.prima];
}

export function measuresAtDifficulty(
  d: number,
  defaults: Record<ZoneCategory, ZoneMeasures>,
  level: Category
): ZoneMeasures {
  const a = anchorsFor(defaults);
  const x = Math.min(DIFFICULTY_MAX, Math.max(DIFFICULTY_MIN, d));
  const seg = x < 1 ? 0 : 1; // segment 0: 3ª→2ª, segment 1: 2ª→1ª (also used to extrapolate)
  const t = x - seg;
  const out = {} as ZoneMeasures;
  for (const f of FIELDS) out[f] = a[seg][f] + (a[seg + 1][f] - a[seg][f]) * t;
  return clampMeasures(out, level);
}

/** Approximate slider position for arbitrary measures (average over fields) */
export function difficultyOf(m: ZoneMeasures, defaults: Record<ZoneCategory, ZoneMeasures>): number {
  const a = anchorsFor(defaults);
  const per: number[] = [];
  for (const f of FIELDS) {
    const [v0, v1, v2] = [a[0][f], a[1][f], a[2][f]];
    const v = m[f];
    // Which side of the 2ª anchor is the value on? Same side as 3ª → segment 0 (3ª↔2ª), else segment 1.
    const seg = (v - v1) * (v0 - v1) > 0 ? 0 : 1;
    const from = seg === 0 ? v0 : v1;
    const to = seg === 0 ? v1 : v2;
    if (Math.abs(to - from) < 1e-9) continue;
    per.push(seg + (v - from) / (to - from));
  }
  if (per.length === 0) return 1;
  const v = per.reduce((s, x) => s + x, 0) / per.length;
  return Math.min(DIFFICULTY_MAX, Math.max(DIFFICULTY_MIN, v));
}

export function difficultyLabel(d: number): string {
  if (d < -0.25) return 'Più facile della 3ª';
  if (d < 0.25) return 'Livello 3ª';
  if (d < 0.75) return 'Tra 3ª e 2ª';
  if (d < 1.25) return 'Livello 2ª';
  if (d < 1.75) return 'Tra 2ª e 1ª';
  if (d < 2.25) return 'Livello 1ª';
  return 'Più difficile della 1ª';
}

// ─── Defaults and snapshots ──────────────────────────────────────────────────

export function defaultZonesFor(category: Category, defaults: Record<ZoneCategory, ZoneMeasures>): SessionZones {
  if (category === 'u10_u12') return { level: 'u10_u12', measures: null, standard: true };
  return { level: category, measures: { ...defaults[category] }, standard: true };
}

/** Zones for a chosen level (no custom edits) */
export function zonesForLevel(level: Category, defaults: Record<ZoneCategory, ZoneMeasures>): Omit<SessionZones, 'standard'> {
  return { level, measures: level === 'u10_u12' ? null : { ...defaults[level] } };
}

/**
 * Final zones stored in a test: the player's choice (or the category defaults),
 * marked standard only when identical to the defaults of the player's own category.
 */
export function resolveSessionZones(
  category: Category,
  choice: Omit<SessionZones, 'standard'> | undefined,
  defaults: Record<ZoneCategory, ZoneMeasures>
): SessionZones {
  const base = defaultZonesFor(category, defaults);
  if (!choice) return base;
  const standard = choice.level === category && sameMeasures(choice.measures, base.measures);
  return { level: choice.level, measures: choice.measures ? { ...choice.measures } : null, standard };
}

/** Tests made before zones existed count as standard */
export function isStandardZones(s: Pick<TestSession, 'zones'>): boolean {
  return !s.zones || s.zones.standard;
}

/** Sessions that count for rankings, objectives and group comparison */
export function countsForRankings(s: Pick<TestSession, 'zones'>, settings: Pick<AppSettings, 'includeCustomZones'>): boolean {
  return settings.includeCustomZones || isStandardZones(s);
}

const fmt = (v: number) => v.toLocaleString('it-IT', { maximumFractionDigits: 2 });

export function describeZones(z: SessionZones | undefined, category: Category): { groundstroke: string; volley: string; serve: string } {
  const level = z?.level ?? category;
  if (!z?.measures) {
    if (level === 'u10_u12') return { groundstroke: 'Area pari / dispari', volley: 'Area pari / dispari', serve: 'Area pari / dispari' };
  }
  const m = z?.measures;
  if (!m) return { groundstroke: '—', volley: '—', serve: '—' };
  return {
    groundstroke: `${fmt(m.gsFromCenter)} m dalla centrale · ${fmt(m.gsFromService)} m dal servizio`,
    volley: `striscia ${fmt(m.volley)} m`,
    serve: `${serveStripsFor(level)} strisce da ${fmt(m.serve)} m`,
  };
}
