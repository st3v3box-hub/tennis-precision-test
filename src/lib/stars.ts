/** Convert % ideale (0–100) to 1–5 stars */
export function percentToStars(pct: number): number {
  if (pct >= 80) return 5;
  if (pct >= 65) return 4;
  if (pct >= 50) return 3;
  if (pct >= 35) return 2;
  return 1;
}

export function renderStars(n: number, max = 5): string {
  return '★'.repeat(n) + '☆'.repeat(max - n);
}

export const STAR_LABELS: Record<number, string> = {
  1: 'Iniziale',
  2: 'Base',
  3: 'Intermedio',
  4: 'Avanzato',
  5: 'Eccellente',
};
