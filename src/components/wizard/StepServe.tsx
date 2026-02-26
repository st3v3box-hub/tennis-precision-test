import React, { useState } from 'react';
import type { WizardState, SeriesResult, TargetStrip } from '../../types';
import { SERVE_SERIES, STRIPS, isStripAllowed } from '../../lib/protocol';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ScoreInput } from '../ui/ScoreInput';
import { PlayerTabBar } from './PlayerTabBar';

interface Props {
  state: WizardState;
  setSeriesResult: (playerIdx: number, r: SeriesResult) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const StepServe: React.FC<Props> = ({ state, setSeriesResult, onNext, onPrev }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const activePlayer = state.players[activeIdx];

  const getStrip = (idx: number): TargetStrip | null => {
    const r = activePlayer.series.find(s => s.testType === 'serve' && s.seriesIndex === idx);
    return r?.targetStrip ?? null;
  };

  const getScore = (idx: number): number | null => {
    const r = activePlayer.series.find(s => s.testType === 'serve' && s.seriesIndex === idx);
    return r?.score ?? null;
  };

  const handleStrip = (spec: (typeof SERVE_SERIES)[0], strip: TargetStrip) => {
    const prevStrips = SERVE_SERIES.slice(0, spec.seriesIndex)
      .map(s => getStrip(s.seriesIndex))
      .filter(Boolean) as TargetStrip[];
    if (!isStripAllowed(prevStrips, strip)) return;
    const existing = activePlayer.series.find(s => s.testType === 'serve' && s.seriesIndex === spec.seriesIndex);
    setSeriesResult(activeIdx, {
      testType: 'serve',
      seriesIndex: spec.seriesIndex,
      score: existing?.score ?? 0,
      serveType: spec.serveType,
      side: spec.side,
      targetStrip: strip,
    });
  };

  const handleScore = (spec: (typeof SERVE_SERIES)[0], score: number) => {
    const existing = activePlayer.series.find(s => s.testType === 'serve' && s.seriesIndex === spec.seriesIndex);
    setSeriesResult(activeIdx, {
      testType: 'serve',
      seriesIndex: spec.seriesIndex,
      score,
      serveType: spec.serveType,
      side: spec.side,
      targetStrip: existing?.targetStrip,
    });
  };

  const isDoneForPlayer = (pidx: number) =>
    SERVE_SERIES.every(s => {
      const r = state.players[pidx].series.find(sr => sr.testType === 'serve' && sr.seriesIndex === s.seriesIndex);
      return r && r.targetStrip && r.score !== undefined;
    });

  const completedFlags = state.players.map((_, i) => isDoneForPlayer(i));
  const canContinue = completedFlags.every(Boolean);

  const activeDone = SERVE_SERIES.filter(s => {
    const r = activePlayer.series.find(sr => sr.testType === 'serve' && sr.seriesIndex === s.seriesIndex);
    return r && r.targetStrip && r.score !== undefined;
  }).length;

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
        title={`Servizio${playerLabel}`}
        subtitle="6 serie × 10 servizi — alternando 1ª/2ª e Destra/Sinistra. Scegli la striscia target."
      >
        <div className="mb-4 text-xs text-amber-700 bg-amber-50 rounded-xl p-3 border border-amber-200">
          <strong>Regola striscia:</strong> dopo 2 scelte uguali consecutive, la terza deve essere diversa.
        </div>

        <div className="flex justify-between text-sm mb-4">
          <span className="text-gray-500">Completate</span>
          <span className={`font-bold ${activeDone === SERVE_SERIES.length ? 'text-green-600' : 'text-gray-700'}`}>
            {activeDone} / {SERVE_SERIES.length}
          </span>
        </div>

        <div className="space-y-5">
          {SERVE_SERIES.map(spec => {
            const prevStrips = SERVE_SERIES.slice(0, spec.seriesIndex)
              .map(s => getStrip(s.seriesIndex))
              .filter(Boolean) as TargetStrip[];
            const score = getScore(spec.seriesIndex);
            const strip = getStrip(spec.seriesIndex);
            const isComplete = strip !== null && score !== null;

            return (
              <div
                key={spec.seriesIndex}
                className={`rounded-xl border-2 p-4
                  ${isComplete ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}
                `}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Serie {spec.seriesIndex + 1}
                    </span>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">
                      {spec.serveType === 'prima' ? '1ª Servizio' : '2ª Servizio'}
                      {' · '}
                      {spec.side === 'right' ? '→ Destra (deuce)' : '← Sinistra (ad)'}
                    </p>
                  </div>
                  {score !== null && strip && (
                    <div className="text-right">
                      <span className={`text-xl font-black
                        ${score >= 8 ? 'text-green-600' : score >= 5 ? 'text-yellow-600' : 'text-red-500'}
                      `}>{score}</span>
                      <p className="text-xs text-gray-500 mt-0.5">Striscia: <strong>{strip}</strong></p>
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-600 mb-2 font-medium">Striscia target:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {STRIPS.map(s => {
                      const allowed = isStripAllowed(prevStrips, s);
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={!allowed}
                          onClick={() => handleStrip(spec, s)}
                          className={`py-2 rounded-lg border-2 text-sm font-semibold transition-all
                            ${strip === s
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : allowed
                                ? 'bg-white border-gray-300 text-gray-700 hover:border-orange-400'
                                : 'bg-gray-100 border-gray-200 text-gray-400 opacity-50 cursor-not-allowed'
                            }`}
                        >
                          {s}
                          {!allowed && <span className="block text-xs font-normal">🚫 Vietata</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <ScoreInput
                  value={score}
                  onChange={v => handleScore(spec, v)}
                />
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onPrev}>← Indietro</Button>
        <Button className="flex-1" disabled={!canContinue} onClick={onNext}>Avanti →</Button>
      </div>
      {!canContinue && (
        <p className="text-center text-xs text-gray-400">
          {state.playerCount > 1
            ? `${completedFlags.filter(Boolean).length}/${state.playerCount} giocatori completati — completa tutte le serie per continuare`
            : `Inserisci score e striscia per tutte le ${SERVE_SERIES.length} serie (${activeDone}/${SERVE_SERIES.length})`
          }
        </p>
      )}
    </div>
  );
};
