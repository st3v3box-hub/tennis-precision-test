import React, { useState } from 'react';
import type { WizardState, SeriesResult } from '../../types';
import { VOLLEY_SERIES } from '../../lib/protocol';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SeriesInputBlock } from './SeriesInputBlock';
import { PlayerTabBar } from './PlayerTabBar';

interface Props {
  state: WizardState;
  setSeriesResult: (playerIdx: number, r: SeriesResult) => void;
  onNext: () => void;
  onPrev: () => void;
}

const PASS_THRESHOLD = VOLLEY_SERIES.length / 2; // 5 perfect series out of 10

export const StepVolley: React.FC<Props> = ({ state, setSeriesResult, onNext, onPrev }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const activePlayer = state.players[activeIdx];

  const perfectCountForPlayer = (pidx: number) =>
    state.players[pidx].series.filter(r => r.testType === 'volley' && r.score === 10).length;

  const isAllFilledForPlayer = (pidx: number) =>
    VOLLEY_SERIES.every(s =>
      state.players[pidx].series.some(r => r.testType === 'volley' && r.seriesIndex === s.seriesIndex)
    );

  const isReadyForPlayer = (pidx: number) =>
    isAllFilledForPlayer(pidx) || perfectCountForPlayer(pidx) >= PASS_THRESHOLD;

  const completedFlags = state.players.map((_, i) => isReadyForPlayer(i));
  const canContinue = completedFlags.every(Boolean);

  const activeDone = VOLLEY_SERIES.filter(s =>
    activePlayer.series.some(r => r.testType === 'volley' && r.seriesIndex === s.seriesIndex)
  ).length;

  const activePerfect = perfectCountForPlayer(activeIdx);
  const hasReachedThreshold = activePerfect >= PASS_THRESHOLD;
  const activeAllFilled = isAllFilledForPlayer(activeIdx);

  const playerLabel = state.playerCount > 1 ? ` — ${activePlayer.name || `Giocatore ${activeIdx + 1}`}` : '';

  return (
    <div className="space-y-4">
      <PlayerTabBar
        players={state.players}
        activeIdx={activeIdx}
        completedFlags={completedFlags}
        onChange={setActiveIdx}
      />

      <Card
        title={`Volley${playerLabel}`}
        subtitle="10 serie × 10 palle — alternando Volee FH incrociata / BH incrociata"
      >
        <SeriesInputBlock
          specs={VOLLEY_SERIES}
          series={activePlayer.series}
          onSet={r => setSeriesResult(activeIdx, r)}
        />
      </Card>

      {hasReachedThreshold && !activeAllFilled && (
        <div className="p-3 bg-green-50 border border-green-300 rounded-xl text-sm text-green-800">
          🎯 <strong>{activePerfect} serie perfette</strong> — soglia raggiunta ({PASS_THRESHOLD}/{VOLLEY_SERIES.length}). Puoi avanzare al passo successivo.
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onPrev}>← Indietro</Button>
        <Button className="flex-1" disabled={!canContinue} onClick={onNext}>Avanti →</Button>
      </div>
      {!canContinue && (
        <p className="text-center text-xs text-gray-400">
          {state.playerCount > 1
            ? `${completedFlags.filter(Boolean).length}/${state.playerCount} giocatori pronti`
            : `${activeDone}/${VOLLEY_SERIES.length} serie compilate · ${activePerfect} perfette (soglia: ${PASS_THRESHOLD})`
          }
        </p>
      )}
    </div>
  );
};
