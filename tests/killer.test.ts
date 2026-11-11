import { describe, it, expect } from 'vitest';
import {
  strokeForBall, computeKillerStats, killerBands, killerReducer, startKiller, killerClock,
  type KillerLiveState,
} from '../src/lib/killer';
import type { KillerAttempt } from '../src/types';

const run = (balls: number, errorStroke: 'fh' | 'bh' | null, playMs = 1000, pickupMs = 0): KillerAttempt =>
  ({ balls, errorStroke, playMs, pickupMs });

describe('strokeForBall', () => {
  it('odd = dritto, even = rovescio', () => {
    expect([1, 2, 3, 100].map(strokeForBall)).toEqual(['fh', 'bh', 'fh', 'bh']);
  });
});

describe('killerBands', () => {
  it('100 palle: 1–10, 11–25, 26–50, 51–75, 76–100', () => {
    expect(killerBands(100).map(b => b.label)).toEqual(['1–10', '11–25', '26–50', '51–75', '76–100']);
  });
  it('covers every ball once for any target', () => {
    for (const t of [1, 3, 7, 10, 20, 37, 50, 150]) {
      const bands = killerBands(t);
      expect(bands[0].from).toBe(1);
      expect(bands[bands.length - 1].to).toBe(t);
      for (let i = 1; i < bands.length; i++) expect(bands[i].from).toBe(bands[i - 1].to + 1);
    }
  });
});

describe('computeKillerStats', () => {
  it('100 di fila al primo colpo → indice 100, Killer', () => {
    const s = computeKillerStats({ target: 100, completed: true, attempts: [run(100, null)] });
    expect(s.index).toBe(100);
    expect(s.rating).toBe('Killer');
    expect(s.errors).toBe(0);
    expect(s.totalBalls).toBe(100);
  });

  it('conta palle giocate, errori, dritto/rovescio, fasce, metà campo', () => {
    // errors at ball 5 (fh), 60 (bh), 98 (bh), then 100 clean
    const attempts = [run(4, 'fh', 10_000, 30_000), run(59, 'bh', 60_000, 40_000), run(97, 'bh', 90_000, 50_000), run(100, null, 95_000)];
    const s = computeKillerStats({ target: 100, completed: true, attempts });
    expect(s.errors).toBe(3);
    expect(s.totalBalls).toBe(4 + 59 + 97 + 100 + 3);
    expect(s.index).toBeCloseTo((100 / 263) * 100, 6);
    expect(s.fhErrors).toBe(1);
    expect(s.bhErrors).toBe(2);
    expect(s.bands.map(b => b.errors)).toEqual([1, 0, 0, 1, 1]);
    expect(s.firstHalfErrors).toBe(1);
    expect(s.secondHalfErrors).toBe(2);
    expect(s.pressureErrors).toBe(1);
    expect(s.bestStreak).toBe(100);
    expect(s.medianRunBeforeError).toBe(59);
    expect(s.playMs).toBe(255_000);
    expect(s.pickupMs).toBe(120_000);
    expect(s.avgPickupMs).toBe(40_000);
    expect(s.trend).toBe('crescita');
  });

  it('ricadute: errore subito dopo un errore', () => {
    const attempts = [run(40, 'fh'), run(2, 'fh'), run(3, 'bh'), run(100, null)];
    const s = computeKillerStats({ target: 100, completed: true, attempts });
    expect(s.relapses).toBe(2);           // run 2 and 3 failed within the first 10 balls after an error
    expect(s.relapseRate).toBeCloseTo((2 / 3) * 100, 6);
  });

  it('test interrotto: nessun indice, miglior serie conservata', () => {
    const s = computeKillerStats({ target: 100, completed: false, attempts: [run(30, 'bh'), run(45, null)] });
    expect(s.index).toBeNull();
    expect(s.rating).toBe('Non completato');
    expect(s.bestStreak).toBe(45);
  });

  it('empty test does not crash', () => {
    const s = computeKillerStats({ target: 100, completed: false, attempts: [] });
    expect(s.totalBalls).toBe(0);
    expect(s.trend).toBeNull();
  });
});

describe('killerReducer', () => {
  const t0 = 1_000_000;
  const play = (s: KillerLiveState, n: number, now: number) => {
    for (let i = 0; i < n; i++) s = killerReducer(s, { type: 'tap', now });
    return s;
  };

  it('errore → raccolta (cronometro fermo) → riparte da zero', () => {
    let s = startKiller(100, t0);
    s = play(s, 12, t0 + 5000);
    s = killerReducer(s, { type: 'error', ball: 13, now: t0 + 10_000 });
    expect(s.phase).toBe('pickup');
    expect(s.attempts[0]).toEqual({ balls: 12, errorStroke: 'fh', playMs: 10_000, pickupMs: 0 });
    // clock: play stopped, pickup running
    expect(killerClock(s, t0 + 40_000)).toEqual({ playMs: 10_000, pickupMs: 30_000 });
    s = killerReducer(s, { type: 'restart', now: t0 + 40_000 });
    expect(s.phase).toBe('playing');
    expect(s.count).toBe(0);
    expect(s.attempts[0].pickupMs).toBe(30_000);
  });

  it('arrivando al target con i tocchi il test si chiude completato', () => {
    let s = startKiller(10, t0);
    s = play(s, 10, t0 + 20_000);
    expect(s.phase).toBe('done');
    expect(s.completed).toBe(true);
    expect(s.attempts).toEqual([{ balls: 10, errorStroke: null, playMs: 20_000, pickupMs: 0 }]);
    expect(killerReducer(s, { type: 'tap', now: t0 + 21_000 })).toBe(s); // ignored after the end
  });

  it('errore inserito senza tocchi: numero palla scritto dal maestro, limitato a 1..target', () => {
    let s = startKiller(100, t0);
    s = killerReducer(s, { type: 'error', ball: 64, now: t0 + 1000 });
    expect(s.attempts[0]).toMatchObject({ balls: 63, errorStroke: 'bh' });
    s = killerReducer(s, { type: 'restart', now: t0 + 2000 });
    s = killerReducer(s, { type: 'error', ball: 500, now: t0 + 3000 });
    expect(s.attempts[1].balls).toBe(99);
  });

  it('completamento confermato e interruzione anticipata', () => {
    let s = killerReducer(startKiller(100, t0), { type: 'complete', now: t0 + 60_000 });
    expect(s.completed).toBe(true);
    expect(s.attempts[0].balls).toBe(100);

    s = play(startKiller(100, t0), 30, t0 + 1000);
    s = killerReducer(s, { type: 'stop', now: t0 + 9000 });
    expect(s.completed).toBe(false);
    expect(s.attempts).toEqual([{ balls: 30, errorStroke: null, playMs: 9000, pickupMs: 0 }]);
  });

  it('stop durante la raccolta chiude il tempo di raccolta', () => {
    let s = killerReducer(startKiller(100, t0), { type: 'error', ball: 5, now: t0 + 1000 });
    s = killerReducer(s, { type: 'stop', now: t0 + 6000 });
    expect(s.attempts).toHaveLength(1);
    expect(s.attempts[0].pickupMs).toBe(5000);
  });

  it('undo non scende sotto zero e non agisce fuori dal gioco', () => {
    let s = startKiller(100, t0);
    expect(killerReducer(s, { type: 'undo' })).toBe(s);
    s = play(s, 2, t0);
    expect(killerReducer(s, { type: 'undo' }).count).toBe(1);
  });
});

import { killerInsights } from '../src/lib/killer';
describe('killerInsights', () => {
  it('perfect run', () => {
    expect(killerInsights(computeKillerStats({ target: 100, completed: true, attempts: [run(100, null)] }))[0]).toMatch(/Serie perfetta/);
  });
  it('flags backhand weakness and late errors', () => {
    const attempts = [run(61, 'bh'), run(71, 'bh'), run(93, 'bh'), run(100, null)];
    const out = killerInsights(computeKillerStats({ target: 100, completed: true, attempts }));
    expect(out.join(' ')).toMatch(/rovescio/);
    expect(out.join(' ')).toMatch(/seconda metà/);
    expect(out.join(' ')).toMatch(/traguardo/);
  });
});
