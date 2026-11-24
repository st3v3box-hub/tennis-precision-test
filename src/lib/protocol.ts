import type { Category, Direction, ServeType, StrokeDirection, TestType, TargetStrip, SeriesResult } from '../types';

export interface SeriesSpec {
  testType: TestType;
  seriesIndex: number;
  direction?: Direction;
  serveType?: ServeType;
  side?: 'right' | 'left';
  label: string;
}

export const GROUNDSTROKES_SERIES: SeriesSpec[] = Array.from({ length: 20 }, (_, i) => ({
  testType: 'groundstrokes',
  seriesIndex: i,
  direction: (i % 2 === 0 ? 'fh_cross' : 'bh_cross') as Direction,
  label: `Serie ${i + 1} — ${i % 2 === 0 ? 'FH Incrociato' : 'BH Incrociato'}`,
}));

// ═════════════════════════════════════════════════════════════════════════════
// Modules with an option chosen for the whole test (direction, side, pattern…)
// ═════════════════════════════════════════════════════════════════════════════

export type OptionModule =
  | 'forehand' | 'backhand' | 'insideout' | 'slice' | 'putaway' | 'approach' | 'smash_volo' | 'smash_rimbalzo' | 'dropshot';
export const OPTION_MODULES: OptionModule[] = [
  'forehand', 'backhand', 'insideout', 'slice', 'putaway', 'approach', 'smash_volo', 'smash_rimbalzo', 'dropshot',
];
export const isOptionModule = (m: TestType): m is OptionModule => (OPTION_MODULES as TestType[]).includes(m);

/** Kept for older call sites: the original single-stroke modules */
export type SingleStrokeModule = 'forehand' | 'backhand' | 'insideout';
export const SINGLE_STROKE_MODULES: SingleStrokeModule[] = ['forehand', 'backhand', 'insideout'];
export const isSingleStroke = (m: TestType): m is SingleStrokeModule => (SINGLE_STROKE_MODULES as TestType[]).includes(m);

/** Where the target is drawn on the court diagram */
export interface ModuleTarget {
  /** groundstroke = back corner box · dropshot = squares at the net · approach = back corners + volley strip */
  zone: 'groundstroke' | 'dropshot' | 'approach';
  /** Groundstroke box on the other side (see CourtZones) */
  mirror: boolean;
}

export interface ModuleOption {
  id: string;
  label: string;
  hint: string;
  /** Directions of the series, in rotation (two = forehand / backhand alternated) */
  cycle: Direction[];
  target: ModuleTarget;
}

const gs = (mirror: boolean): ModuleTarget => ({ zone: 'groundstroke', mirror });

/**
 * Options of every configurable module; the first one is the default.
 * Court drawing convention: mirror = false is the forehand-crosscourt corner,
 * mirror = true the opposite one (backhand crosscourt, forehand down the line).
 */
export const MODULE_OPTIONS: Record<OptionModule, ModuleOption[]> = {
  forehand: [
    { id: 'cross', label: 'Incrociato', hint: 'in diagonale', cycle: ['fh_cross'], target: gs(false) },
    { id: 'line', label: 'Lungolinea', hint: 'lungo la linea', cycle: ['fh_line'], target: gs(true) },
  ],
  backhand: [
    { id: 'cross', label: 'Incrociato', hint: 'in diagonale', cycle: ['bh_cross'], target: gs(true) },
    { id: 'line', label: 'Lungolinea', hint: 'lungo la linea', cycle: ['bh_line'], target: gs(false) },
  ],
  insideout: [
    { id: 'cross', label: 'Inside-out', hint: 'incrociato, sul rovescio dell\'avversario', cycle: ['io_cross'], target: gs(true) },
    { id: 'line', label: 'Inside-in', hint: 'lungolinea, sul dritto dell\'avversario', cycle: ['io_line'], target: gs(false) },
  ],
  slice: [
    { id: 'bh_cross', label: 'Rovescio incrociato', hint: 'back di rovescio in diagonale', cycle: ['sl_bh_cross'], target: gs(true) },
    { id: 'bh_line', label: 'Rovescio lungolinea', hint: 'back di rovescio lungo la linea', cycle: ['sl_bh_line'], target: gs(false) },
    { id: 'fh_cross', label: 'Dritto incrociato', hint: 'back di dritto in diagonale', cycle: ['sl_fh_cross'], target: gs(false) },
    { id: 'fh_line', label: 'Dritto lungolinea', hint: 'back di dritto lungo la linea', cycle: ['sl_fh_line'], target: gs(true) },
  ],
  putaway: [
    { id: 'cross', label: 'Incrociato', hint: 'palla corta e alta, chiusa in diagonale', cycle: ['pa_cross'], target: gs(false) },
    { id: 'line', label: 'Lungolinea', hint: 'palla corta e alta, chiusa lungo la linea', cycle: ['pa_line'], target: gs(true) },
  ],
  approach: [
    {
      id: 'line', label: 'Attacco lungolinea + volée incrociata', hint: 'dritto e rovescio alternati',
      cycle: ['ap_fh_line', 'ap_bh_line'], target: { zone: 'approach', mirror: false },
    },
    {
      id: 'cross', label: 'Attacco incrociato + volée lungolinea', hint: 'dritto e rovescio alternati',
      cycle: ['ap_fh_cross', 'ap_bh_cross'], target: { zone: 'approach', mirror: false },
    },
  ],
  smash_volo: [
    { id: 'fh', label: 'Zona del dritto', hint: 'angolo di fondo del dritto', cycle: ['sm_fh'], target: gs(false) },
    { id: 'bh', label: 'Zona del rovescio', hint: 'angolo di fondo del rovescio', cycle: ['sm_bh'], target: gs(true) },
  ],
  smash_rimbalzo: [
    { id: 'fh', label: 'Zona del dritto', hint: 'angolo di fondo del dritto', cycle: ['sm_fh'], target: gs(false) },
    { id: 'bh', label: 'Zona del rovescio', hint: 'angolo di fondo del rovescio', cycle: ['sm_bh'], target: gs(true) },
  ],
  dropshot: [
    { id: 'cross', label: 'Incrociata', hint: 'dritto e rovescio alternati, in diagonale', cycle: ['ds_fh_cross', 'ds_bh_cross'], target: { zone: 'dropshot', mirror: false } },
    { id: 'line', label: 'Lungolinea', hint: 'dritto e rovescio alternati, lungo la linea', cycle: ['ds_fh_line', 'ds_bh_line'], target: { zone: 'dropshot', mirror: false } },
  ],
};

export function moduleOption(module: OptionModule, id: string | undefined): ModuleOption {
  const list = MODULE_OPTIONS[module];
  return list.find(o => o.id === id) ?? list[0];
}

/** Modules where a series is 5 pairs of shots: a pair counts only when both are in (score = pairs × 2) */
export const PAIR_MODULES: TestType[] = ['approach'];
export const isPairModule = (m: TestType) => PAIR_MODULES.includes(m);

/** What a series direction means, for the series cards */
export const DIRECTION_TEXT: Record<Direction, string> = {
  fh_cross: 'Dritto incrociato',
  bh_cross: 'Rovescio incrociato',
  fh_line: 'Dritto lungolinea',
  bh_line: 'Rovescio lungolinea',
  io_cross: 'Sventaglio inside-out',
  io_line: 'Sventaglio inside-in',
  lungolinea: 'Lungolinea',
  diagonale: 'Diagonale',
  right: 'Da destra',
  left: 'Da sinistra',
  fh_volley: 'Volée di dritto',
  bh_volley: 'Volée di rovescio',
  ds_fh_cross: 'Smorzata di dritto incrociata',
  ds_bh_cross: 'Smorzata di rovescio incrociata',
  ds_fh_line: 'Smorzata di dritto lungolinea',
  ds_bh_line: 'Smorzata di rovescio lungolinea',
  ap_fh_line: 'Attacco di dritto lungolinea + volée incrociata',
  ap_bh_line: 'Attacco di rovescio lungolinea + volée incrociata',
  ap_fh_cross: 'Attacco di dritto incrociato + volée lungolinea',
  ap_bh_cross: 'Attacco di rovescio incrociato + volée lungolinea',
  sl_fh_cross: 'Back di dritto incrociato',
  sl_fh_line: 'Back di dritto lungolinea',
  sl_bh_cross: 'Back di rovescio incrociato',
  sl_bh_line: 'Back di rovescio lungolinea',
  pa_cross: 'Dritto di chiusura incrociato',
  pa_line: 'Dritto di chiusura lungolinea',
  sm_fh: 'Smash nella zona del dritto',
  sm_bh: 'Smash nella zona del rovescio',
};

/** The 20 series of a configurable module with the chosen option */
export function optionSeries(module: OptionModule, optionId: string | undefined): SeriesSpec[] {
  const opt = moduleOption(module, optionId);
  return Array.from({ length: MODULE_SERIES[module] }, (_, i) => {
    const direction = opt.cycle[i % opt.cycle.length];
    return { testType: module, seriesIndex: i, direction, label: `Serie ${i + 1} — ${DIRECTION_TEXT[direction]}` };
  });
}

/** Option used by a module in an existing series list (first option when unknown) */
export function detectedOption(series: SeriesResult[], module: OptionModule): ModuleOption {
  const d = series.find(s => s.testType === module && s.direction)?.direction;
  return MODULE_OPTIONS[module].find(o => d !== undefined && o.cycle.includes(d)) ?? MODULE_OPTIONS[module][0];
}

/** Module name with its option, e.g. "Solo dritto incrociato", "Back (slice) · rovescio lungolinea" */
export function moduleDisplayName(series: SeriesResult[], module: TestType): string {
  if (!isOptionModule(module)) return MODULE_LABELS[module];
  const opt = detectedOption(series, module).label.toLowerCase();
  return isSingleStroke(module) || module === 'putaway' || module === 'dropshot'
    ? `${MODULE_LABELS[module]} ${opt}`
    : `${MODULE_LABELS[module]} · ${opt}`;
}

// ─── Compatibility helpers for the original single-stroke modules ────────────

export function directionLabel(module: SingleStrokeModule, dir: StrokeDirection): string {
  return moduleOption(module, dir).label;
}
export function directionHint(module: SingleStrokeModule, dir: StrokeDirection): string {
  return moduleOption(module, dir).hint;
}
export function targetMirrored(module: SingleStrokeModule, dir: StrokeDirection): boolean {
  return moduleOption(module, dir).target.mirror;
}
export function singleStrokeSeries(module: SingleStrokeModule, dir: StrokeDirection): SeriesSpec[] {
  return optionSeries(module, dir);
}
export const DIRECTION_LABEL: Record<StrokeDirection, string> = { cross: 'Incrociato', line: 'Lungolinea' };
export function detectedDirection(series: SeriesResult[], module: SingleStrokeModule): StrokeDirection {
  return detectedOption(series, module).id === 'line' ? 'line' : 'cross';
}

export const COMBINED_SERIES: SeriesSpec[] = Array.from({ length: 10 }, (_, i) => ({
  testType: 'combined',
  seriesIndex: i,
  direction: (i % 2 === 0 ? 'lungolinea' : 'diagonale') as Direction,
  label: `Serie ${i + 1} — ${i % 2 === 0 ? 'Lungolinea' : 'Diagonale'}`,
}));

export const RETURN_SERIES: SeriesSpec[] = Array.from({ length: 10 }, (_, i) => ({
  testType: 'return',
  seriesIndex: i,
  direction: (i % 2 === 0 ? 'right' : 'left') as Direction,
  label: `Serie ${i + 1} — Palla da ${i % 2 === 0 ? 'Destra (deuce)' : 'Sinistra (ad)'}`,
}));

/** 6 serie: alternating 1ª-destra / 2ª-sinistra */
export const SERVE_SERIES: SeriesSpec[] = Array.from({ length: 6 }, (_, i) => ({
  testType: 'serve',
  seriesIndex: i,
  serveType: (i % 2 === 0 ? 'prima' : 'seconda') as ServeType,
  side: (i % 2 === 0 ? 'right' : 'left') as 'right' | 'left',
  label: `Serie ${i + 1} — ${i % 2 === 0 ? '1ª Servizio da Destra' : '2ª Servizio da Sinistra'}`,
}));

export const VOLLEY_SERIES: SeriesSpec[] = Array.from({ length: 10 }, (_, i) => ({
  testType: 'volley',
  seriesIndex: i,
  direction: (i % 2 === 0 ? 'fh_volley' : 'bh_volley') as Direction,
  label: `Serie ${i + 1} — ${i % 2 === 0 ? 'Volee FH Incrociata' : 'Volee BH Incrociata'}`,
}));

export const STRIPS: TargetStrip[] = ['T', 'body', 'wide'];

/**
 * Serve constraint: after two consecutive same strips, the third must be different.
 * Returns true if the proposed strip is ALLOWED given previous choices.
 */
export function isStripAllowed(previousStrips: TargetStrip[], proposed: TargetStrip): boolean {
  if (previousStrips.length < 2) return true;
  const last = previousStrips[previousStrips.length - 1];
  const secondLast = previousStrips[previousStrips.length - 2];
  if (last === secondLast && last === proposed) return false;
  return true;
}

// ─── Category targets (text descriptions + SVG mini-diagram) ─────────────────

export interface CategoryTarget {
  label: string;
  groundstroke: string;
  volley: string;
  serve: string;
  description: string;
}

export const CATEGORY_TARGETS: Record<Category, CategoryTarget> = {
  u10_u12: {
    label: 'U10/U12',
    groundstroke: 'Area pari / dispari',
    volley: 'Area pari / dispari',
    serve: 'Area pari / dispari',
    description: 'Due aree: PARI per il dritto, DISPARI per il rovescio',
  },
  terza: {
    label: '3ª Categoria',
    groundstroke: '1 m dalla centrale · 1 m dal servizio',
    volley: 'striscia 1,5 m',
    serve: '2 strisce da 2,06 m',
    description: 'Zone più ampie',
  },
  seconda: {
    label: '2ª Categoria',
    groundstroke: '1,5 m dalla centrale · 2 m dal servizio',
    volley: 'striscia 1,2 m',
    serve: '3 strisce da 1,2 m',
    description: 'Zone intermedie',
  },
  prima: {
    label: '1ª Categoria',
    groundstroke: '2 m dalla centrale · 3 m dal servizio',
    volley: 'striscia 0,7 m',
    serve: '3 strisce da 0,7 m',
    description: 'Zone più piccole',
  },
};

export const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'u10_u12', label: 'U10/U12' },
  { value: 'terza', label: '3ª Cat.' },
  { value: 'seconda', label: '2ª Cat.' },
  { value: 'prima', label: '1ª Cat.' },
];

/** Canonical order of test modules (used for step routing) */
export const MODULE_STEP_ORDER: TestType[] = [
  'groundstrokes', 'forehand', 'backhand', 'insideout', 'slice', 'putaway', 'combined',
  'return', 'serve',
  'volley', 'approach', 'smash_volo', 'smash_rimbalzo',
  'dropshot',
];

/** Modules selected by default in a new session (the original full protocol) */
export const DEFAULT_MODULES: TestType[] = ['groundstrokes', 'combined', 'return', 'serve', 'volley'];

/** Groundstrokes (alternating) cannot be combined with the single-stroke modules in one session */
export const EXCLUSIVE_WITH: Partial<Record<TestType, TestType[]>> = {
  groundstrokes: ['forehand', 'backhand'],
  forehand: ['groundstrokes'],
  backhand: ['groundstrokes'],
};

export const MODULE_LABELS: Record<TestType, string> = {
  groundstrokes: 'Groundstrokes (dritto + rovescio)',
  forehand: 'Solo dritto',
  backhand: 'Solo rovescio',
  insideout: 'Sventaglio di dritto',
  combined: 'Combined',
  return: 'Return',
  serve: 'Servizio',
  volley: 'Volley',
  slice: 'Back (slice)',
  putaway: 'Dritto di chiusura',
  approach: 'Attacco e volée',
  smash_volo: 'Smash al volo',
  smash_rimbalzo: 'Smash a rimbalzo',
  dropshot: 'Smorzata',
};

/** Series in the protocol for each module */
export const MODULE_SERIES: Record<TestType, number> = {
  groundstrokes: 20,
  forehand: 20,
  backhand: 20,
  insideout: 20,
  combined: 10,
  return: 10,
  serve: 6,
  volley: 10,
  slice: 20,
  putaway: 20,
  approach: 20,
  smash_volo: 20,
  smash_rimbalzo: 20,
  dropshot: 20,
};

/**
 * Perfect series (10/10) needed to pass each module: half of the protocol series.
 * Groundstrokes: 10 in total between forehand and backhand.
 */
export const MODULE_PASS: Record<TestType, number> = {
  groundstrokes: 10,
  forehand: 10,
  backhand: 10,
  insideout: 10,
  combined: 5,
  return: 5,
  serve: 3,
  volley: 5,
  slice: 10,
  putaway: 10,
  approach: 10,
  smash_volo: 10,
  smash_rimbalzo: 10,
  dropshot: 10,
};

export type ModuleOutcome = 'superato' | 'non_superato' | 'interrotto';

export interface ModulePass {
  module: TestType;
  played: number;
  perfect: number;
  required: number;
  passed: boolean;
  /** Played to the end (all series) or stopped because passed */
  complete: boolean;
  /** superato = passed · non_superato = all series played without passing · interrotto = stopped before */
  outcome: ModuleOutcome;
}

export const OUTCOME_LABEL: Record<ModuleOutcome, string> = {
  superato: 'superato',
  non_superato: 'non superato',
  interrotto: 'interrotto',
};

/** Pass/fail of every module present in a session */
export function modulePasses(series: SeriesResult[]): ModulePass[] {
  return detectedModules(series).map(module => {
    const own = series.filter(s => s.testType === module);
    const perfect = own.filter(s => s.score === 10).length;
    const passed = perfect >= MODULE_PASS[module];
    const complete = passed || own.length >= MODULE_SERIES[module];
    return {
      module, played: own.length, perfect, required: MODULE_PASS[module], passed, complete,
      outcome: passed ? 'superato' : complete ? 'non_superato' : 'interrotto',
    };
  });
}

/** A module is finished for a player when all its series are in or it has been passed */
export function moduleDone(series: SeriesResult[], module: TestType): boolean {
  const own = series.filter(s => s.testType === module);
  return own.length >= MODULE_SERIES[module] || own.filter(s => s.score === 10).length >= MODULE_PASS[module];
}

/** Some module was stopped before its end (rain, darkness, time…) */
export function sessionInterrupted(series: SeriesResult[]): boolean {
  return modulePasses(series).some(m => m.outcome === 'interrotto');
}

/**
 * Partial = the test does not cover every stroke of the full protocol
 * (e.g. only "Solo dritto"). Its % is computed on the strokes actually tested.
 */
export function sessionPartial(series: SeriesResult[]): boolean {
  const mods = new Set(detectedModules(series));
  const fh = mods.has('groundstrokes') || mods.has('forehand');
  const bh = mods.has('groundstrokes') || mods.has('backhand');
  return !(fh && bh && mods.has('combined') && mods.has('return') && mods.has('serve') && mods.has('volley'));
}

/** Short label for lists and rankings, e.g. "parziale · Solo dritto" or "interrotto" */
export function sessionScopeLabel(series: SeriesResult[]): string | null {
  const parts: string[] = [];
  if (sessionPartial(series)) parts.push(`parziale · ${detectedModules(series).map(m => MODULE_LABELS[m]).join(', ')}`);
  if (sessionInterrupted(series)) parts.push('interrotto');
  return parts.length ? parts.join(' · ') : null;
}

/** A session passes when every module it contains is passed (false when no module was played) */
export function sessionPassed(series: SeriesResult[]): boolean {
  const mods = modulePasses(series);
  return mods.length > 0 && mods.every(m => m.passed);
}

/** Returns the modules present in a series array, in canonical order */
export function detectedModules(series: SeriesResult[]): TestType[] {
  const found = new Set(series.map(s => s.testType));
  return MODULE_STEP_ORDER.filter(m => found.has(m));
}

// Wizard step sequence
export const WIZARD_STEPS = [
  { id: 'meta', label: 'Info', title: 'Sessione & Categoria' },
  { id: 'groundstrokes', label: 'Groundstrokes', title: 'Groundstrokes (20 serie)' },
  { id: 'forehand', label: 'Dritto', title: 'Solo dritto (20 serie)' },
  { id: 'backhand', label: 'Rovescio', title: 'Solo rovescio (20 serie)' },
  { id: 'insideout', label: 'Sventaglio', title: 'Sventaglio di dritto (20 serie)' },
  { id: 'combined', label: 'Combined', title: 'Combined (10 serie)' },
  { id: 'return', label: 'Return', title: 'Return (10 serie)' },
  { id: 'serve', label: 'Servizio', title: 'Servizio (6 serie)' },
  { id: 'slice', label: 'Back', title: 'Back / slice (20 serie)' },
  { id: 'putaway', label: 'Chiusura', title: 'Dritto di chiusura (20 serie)' },
  { id: 'volley', label: 'Volley', title: 'Volley (10 serie)' },
  { id: 'approach', label: 'Attacco', title: 'Attacco e volée (20 serie da 5 coppie)' },
  { id: 'smash_volo', label: 'Smash volo', title: 'Smash al volo (20 serie)' },
  { id: 'smash_rimbalzo', label: 'Smash rimb.', title: 'Smash a rimbalzo (20 serie)' },
  { id: 'dropshot', label: 'Smorzata', title: 'Smorzata (20 serie)' },
  { id: 'review', label: 'Review', title: 'Riepilogo & Salva' },
];

// ═════════════════════════════════════════════════════════════════════════════
// Families of strokes: colours in the module list and family radars
// ═════════════════════════════════════════════════════════════════════════════

export type Family = 'fondo' | 'servizio' | 'rete' | 'sensibilita';
export const FAMILY_ORDER: Family[] = ['fondo', 'servizio', 'rete', 'sensibilita'];

export const MODULE_FAMILY: Record<TestType, Family> = {
  groundstrokes: 'fondo', forehand: 'fondo', backhand: 'fondo', insideout: 'fondo', slice: 'fondo', putaway: 'fondo', combined: 'fondo',
  return: 'servizio', serve: 'servizio',
  volley: 'rete', approach: 'rete', smash_volo: 'rete', smash_rimbalzo: 'rete',
  dropshot: 'sensibilita',
};

export interface FamilyMeta {
  label: string;
  /** Hex for charts */
  color: string;
  /** Tailwind classes (written in full so the build keeps them) */
  selected: string;
  idle: string;
  idleText: string;
  dot: string;
  soft: string;
  ink: string;
}

export const FAMILY_META: Record<Family, FamilyMeta> = {
  fondo: {
    label: 'Fondo campo', color: '#17663e',
    selected: 'border-brand-600 bg-brand-600', idle: 'border-brand-200 bg-brand-50/60', idleText: 'text-brand-800',
    dot: 'bg-brand-600', soft: 'bg-brand-50 text-brand-800', ink: 'text-brand-700',
  },
  servizio: {
    label: 'Servizio e risposta', color: '#b45309',
    selected: 'border-amber-600 bg-amber-600', idle: 'border-amber-200 bg-amber-50/70', idleText: 'text-amber-800',
    dot: 'bg-amber-600', soft: 'bg-amber-50 text-amber-800', ink: 'text-amber-700',
  },
  rete: {
    label: 'Rete', color: '#0369a1',
    selected: 'border-sky-700 bg-sky-700', idle: 'border-sky-200 bg-sky-50/70', idleText: 'text-sky-800',
    dot: 'bg-sky-700', soft: 'bg-sky-50 text-sky-800', ink: 'text-sky-700',
  },
  sensibilita: {
    label: 'Sensibilità', color: '#6d28d9',
    selected: 'border-violet-700 bg-violet-700', idle: 'border-violet-200 bg-violet-50/70', idleText: 'text-violet-800',
    dot: 'bg-violet-700', soft: 'bg-violet-50 text-violet-800', ink: 'text-violet-700',
  },
};
