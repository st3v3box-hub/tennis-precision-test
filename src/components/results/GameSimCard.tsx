import React from 'react';
import type { SeriesResult, TestSession } from '../../types';
import { MODULE_STEP_ORDER, moduleDisplayName } from '../../lib/protocol';
import { gameScoreLabel, gameThresholdFor, seriesInPlayOrder, simulateGames, type GameSimState } from '../../lib/match';
import { useAppData } from '../../contexts/AppDataContext';

/** Who is ahead in a simulated match: compares sets, then games, then points. */
export function simLeader(st: GameSimState): 'player' | 'opponent' | 'pari' {
  const setsWon = st.sets.filter(([a, b]) => a > b).length;
  const setsLost = st.sets.length - setsWon;
  if (setsWon !== setsLost) return setsWon > setsLost ? 'player' : 'opponent';
  if (st.games[0] !== st.games[1]) return st.games[0] > st.games[1] ? 'player' : 'opponent';
  if (st.points[0] !== st.points[1]) return st.points[0] > st.points[1] ? 'player' : 'opponent';
  return 'pari';
}

/** One-line live score for the wizard: "Match simulato 3-1 (30-15)". */
export function liveSimLabel(series: SeriesResult[], threshold: number): string | null {
  if (series.length === 0) return null;
  return gameScoreLabel(simulateGames(seriesInPlayOrder(series), threshold));
}

/**
 * The test read as a tennis match against an imaginary opponent: every series is a point,
 * won when it reaches the category threshold.
 */
export const GameSimCard: React.FC<{ session: TestSession }> = ({ session }) => {
  const { settings } = useAppData();
  const threshold = gameThresholdFor(session.category, settings.matchGameThresholds);
  const scores = seriesInPlayOrder(session.series);
  if (scores.length === 0) return null;
  const st = simulateGames(scores, threshold);
  const leader = simLeader(st);

  // Score at the end of every module, in the order they were played
  const modules = MODULE_STEP_ORDER.filter(m => session.series.some(s => s.testType === m));
  let upTo: SeriesResult[] = [];
  const steps = modules.map(m => {
    upTo = [...upTo, ...session.series.filter(s => s.testType === m)];
    return { m, label: gameScoreLabel(simulateGames(seriesInPlayOrder(upTo), threshold)) };
  });

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="font-display font-bold text-lg leading-tight">Match simulato</h3>
        <p className={`font-display font-extrabold text-2xl leading-none tabular-nums ${leader === 'player' ? 'text-ok-600' : leader === 'opponent' ? 'text-red-600' : 'text-ink'}`}>
          {gameScoreLabel(st)}
        </p>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Ogni serie è un punto: suo con almeno {threshold}/10, altrimenti dell'avversario. Punto secco sul 40-40, tie-break sul 6-6.
        Punti vinti {st.pointsWon} su {st.pointsPlayed}.
      </p>
      {steps.length > 1 && (
        <ol className="mt-3 flex flex-wrap gap-1.5">
          {steps.map(s => (
            <li key={s.m} className="text-xs rounded-lg bg-gray-50 border border-gray-200 px-2 py-1">
              dopo {moduleDisplayName(session.series, s.m)}: <strong className="tabular-nums">{s.label}</strong>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
