import type { WizardState } from '../types';

// A test in progress is copied on the phone at every change, so closing the browser,
// a reload or a dead battery never loses the series already entered.

const KEY = 'tpt_wizard_autosave_v1';

export interface WizardAutosave {
  state: WizardState;
  savedAt: string;
}

/** Worth keeping: at least one series entered, or the coach is already past the first page */
export const worthSaving = (s: WizardState) => s.step > 0 || s.players.some(p => p.series.length > 0);

export function readAutosave(): WizardAutosave | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as WizardAutosave;
    const s = a?.state;
    if (!s || !Array.isArray(s.players) || !Array.isArray(s.selectedModules) || typeof s.step !== 'number') return null;
    if (s.players.some(p => !Array.isArray(p.series))) return null;
    return a;
  } catch {
    return null;
  }
}

export function writeAutosave(state: WizardState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ state, savedAt: new Date().toISOString() } satisfies WizardAutosave));
  } catch { /* storage full or blocked: the remote draft still protects the data */ }
}

export function clearAutosave(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** "Mario Rossi · 12 serie" for the resume prompts */
export function autosaveSummary(a: WizardAutosave): { names: string; series: number; time: string } {
  const names = a.state.players.map(p => p.name.trim()).filter(Boolean).join(', ') || 'giocatore senza nome';
  const series = a.state.players.reduce((n, p) => n + p.series.length, 0);
  const d = new Date(a.savedAt);
  const time = Number.isNaN(d.getTime()) ? '' : d.toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return { names, series, time };
}
