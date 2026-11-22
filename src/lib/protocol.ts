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

/** Single-stroke modules: 20 series of the same stroke, direction chosen for the whole test */
export function singleStrokeSeries(module: 'forehand' | 'backhand', dir: StrokeDirection): SeriesSpec[] {
  const direction: Direction = module === 'forehand'
    ? (dir === 'line' ? 'fh_line' : 'fh_cross')
    : (dir === 'line' ? 'bh_line' : 'bh_cross');
  const stroke = module === 'forehand' ? 'Dritto' : 'Rovescio';
  const where = dir === 'line' ? 'lungolinea' : 'incrociato';
  return Array.from({ length: 20 }, (_, i) => ({
    testType: module,
    seriesIndex: i,
    direction,
    label: `Serie ${i + 1} — ${stroke} ${where}`,
  }));
}

export const DIRECTION_LABEL: Record<StrokeDirection, string> = { cross: 'Incrociato', line: 'Lungolinea' };

/** Direction used by a single-stroke module in an existing series list (defaults to cross) */
export function detectedDirection(series: SeriesResult[], module: 'forehand' | 'backhand'): StrokeDirection {
  const d = series.find(s => s.testType === module)?.direction;
  return d === 'fh_line' || d === 'bh_line' ? 'line' : 'cross';
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
export const MODULE_STEP_ORDER: TestType[] = ['groundstrokes', 'forehand', 'backhand', 'combined', 'return', 'serve', 'volley'];

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
  combined: 'Combined',
  return: 'Return',
  serve: 'Servizio',
  volley: 'Volley',
};

/** Series in the protocol for each module */
export const MODULE_SERIES: Record<TestType, number> = {
  groundstrokes: 20,
  forehand: 20,
  backhand: 20,
  combined: 10,
  return: 10,
  serve: 6,
  volley: 10,
};

/**
 * Perfect series (10/10) needed to pass each module: half of the protocol series.
 * Groundstrokes: 10 in total between forehand and backhand.
 */
export const MODULE_PASS: Record<TestType, number> = {
  groundstrokes: 10,
  forehand: 10,
  backhand: 10,
  combined: 5,
  return: 5,
  serve: 3,
  volley: 5,
};

export interface ModulePass {
  module: TestType;
  played: number;
  perfect: number;
  required: number;
  passed: boolean;
}

/** Pass/fail of every module present in a session */
export function modulePasses(series: SeriesResult[]): ModulePass[] {
  return detectedModules(series).map(module => {
    const own = series.filter(s => s.testType === module);
    const perfect = own.filter(s => s.score === 10).length;
    return { module, played: own.length, perfect, required: MODULE_PASS[module], passed: perfect >= MODULE_PASS[module] };
  });
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
  { id: 'combined', label: 'Combined', title: 'Combined (10 serie)' },
  { id: 'return', label: 'Return', title: 'Return (10 serie)' },
  { id: 'serve', label: 'Servizio', title: 'Servizio (6 serie)' },
  { id: 'volley', label: 'Volley', title: 'Volley (10 serie)' },
  { id: 'review', label: 'Review', title: 'Riepilogo & Salva' },
];
