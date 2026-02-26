import type { Category, Direction, ServeType, TestType, TargetStrip } from '../types';

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

/** Returns the strip that is forced (if any) given the history */
export function getForcedStrip(previousStrips: TargetStrip[]): TargetStrip | null {
  if (previousStrips.length < 2) return null;
  const last = previousStrips[previousStrips.length - 1];
  const secondLast = previousStrips[previousStrips.length - 2];
  if (last === secondLast) return null; // forced to pick something different — no single forced value
  return null;
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
  terza: {
    label: '3ª Categoria',
    groundstroke: '1m × 1m',
    volley: '1.5m',
    serve: '2.06m + 2.06m + rif. 1m',
    description: 'Zone ampie per principianti avanzati',
  },
  seconda: {
    label: '2ª Categoria',
    groundstroke: '1.5m × 2m',
    volley: '1.2m',
    serve: '1.2m × 3 strisce',
    description: 'Zone intermedie per giocatori competitivi',
  },
  prima: {
    label: '1ª Categoria',
    groundstroke: '2m × 3m',
    volley: '0.7m',
    serve: '0.7m × 3 strisce',
    description: 'Zone precise per giocatori agonisti',
  },
};

export const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'terza', label: '3ª Categoria' },
  { value: 'seconda', label: '2ª Categoria' },
  { value: 'prima', label: '1ª Categoria' },
];

// Wizard step sequence
export const WIZARD_STEPS = [
  { id: 'meta', label: 'Info', title: 'Sessione & Categoria' },
  { id: 'groundstrokes', label: 'Groundstrokes', title: 'Groundstrokes (20 serie)' },
  { id: 'combined', label: 'Combined', title: 'Combined (10 serie)' },
  { id: 'return', label: 'Return', title: 'Return (10 serie)' },
  { id: 'serve', label: 'Servizio', title: 'Servizio (6 serie)' },
  { id: 'volley', label: 'Volley', title: 'Volley (10 serie)' },
  { id: 'review', label: 'Review', title: 'Riepilogo & Salva' },
];
