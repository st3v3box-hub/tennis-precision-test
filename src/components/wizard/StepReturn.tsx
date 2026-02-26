import React, { useState } from 'react';
import type { WizardState, SeriesResult } from '../../types';
import { RETURN_SERIES } from '../../lib/protocol';
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

export const StepReturn: React.FC<Props> = ({ state, setSeriesResult, onNext, onPrev }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const activePlayer = state.players[activeIdx];

  const isDoneForPlayer = (pidx: number) =>
    RETURN_SERIES.every(s =>
      state.players[pidx].series.some(r => r.testType === 'return' && r.seriesIndex === s.seriesIndex)
    );

  const completedFlags = state.players.map((_, i) => isDoneForPlayer(i));
  const canContinue = completedFlags.every(Boolean);

  const activeDone = RETURN_SERIES.filter(s =>
    activePlayer.series.some(r => r.testType === 'return' && r.seriesIndex === s.seriesIndex)
  ).length;

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
        title={`Return${playerLabel}`}
        subtitle="10 serie × 10 risposte — alternando Destra / Sinistra — obiettivo: rimettere in campo"
      >
        <SeriesInputBlock
          specs={RETURN_SERIES}
          series={activePlayer.series}
          onSet={r => setSeriesResult(activeIdx, r)}
        />
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onPrev}>← Indietro</Button>
        <Button className="flex-1" disabled={!canContinue} onClick={onNext}>Avanti →</Button>
      </div>
      {!canContinue && (
        <p className="text-center text-xs text-gray-400">
          {state.playerCount > 1
            ? `${completedFlags.filter(Boolean).length}/${state.playerCount} giocatori completati — completa tutte le serie per continuare`
            : `Inserisci tutte le ${RETURN_SERIES.length} serie (${activeDone}/${RETURN_SERIES.length})`
          }
        </p>
      )}
    </div>
  );
};
