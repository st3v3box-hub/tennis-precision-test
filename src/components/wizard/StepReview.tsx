import React, { useState } from 'react';
import type { WizardState, WizardPlayerData } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { mean } from '../../lib/formulas';
import {
  GROUNDSTROKES_SERIES,
  COMBINED_SERIES,
  RETURN_SERIES,
  SERVE_SERIES,
  VOLLEY_SERIES,
} from '../../lib/protocol';

interface Props {
  state: WizardState;
  onPrev: () => void;
  onSave: () => void;
}

interface SummaryRow {
  label: string;
  total: number;
  done: number;
  avg: number | null;
}

function makeRows(player: WizardPlayerData): SummaryRow[] {
  const make = (label: string, specs: { testType: string; seriesIndex: number }[]): SummaryRow => {
    const scores = specs
      .map(s => player.series.find(r => r.testType === s.testType && r.seriesIndex === s.seriesIndex)?.score)
      .filter(s => s !== undefined) as number[];
    return { label, total: specs.length, done: scores.length, avg: scores.length > 0 ? mean(scores) : null };
  };

  return [
    make('Groundstrokes FH', GROUNDSTROKES_SERIES.filter(s => s.direction === 'fh_cross')),
    make('Groundstrokes BH', GROUNDSTROKES_SERIES.filter(s => s.direction === 'bh_cross')),
    make('Combined', COMBINED_SERIES),
    make('Return', RETURN_SERIES),
    make('Servizio', SERVE_SERIES),
    make('Volley', VOLLEY_SERIES),
  ];
}

const PlayerSummary: React.FC<{ player: WizardPlayerData; label: string }> = ({ player, label }) => {
  const rows = makeRows(player);
  const allDone = rows.every(r => r.done === r.total);

  return (
    <div>
      {label && <h3 className="text-sm font-bold text-gray-700 mb-2">{label}</h3>}
      <div className="rounded-xl overflow-hidden border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 text-gray-600 font-semibold">Test</th>
              <th className="text-center px-3 py-2 text-gray-600 font-semibold">Serie</th>
              <th className="text-center px-3 py-2 text-gray-600 font-semibold">Media</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2 font-medium">{row.label}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`font-bold ${row.done === row.total ? 'text-green-600' : 'text-red-500'}`}>
                    {row.done}/{row.total}
                  </span>
                </td>
                <td className="px-3 py-2 text-center font-bold text-gray-700">
                  {row.avg !== null ? row.avg.toFixed(1) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!allDone && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          Attenzione: alcune serie non sono state completate.
        </div>
      )}
    </div>
  );
};

export const StepReview: React.FC<Props> = ({ state, onPrev, onSave }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  const allDone = state.players.every(p => makeRows(p).every(r => r.done === r.total));

  return (
    <div className="space-y-4">
      <Card title="Riepilogo Sessione">
        <div className="space-y-1 text-sm mb-4">
          <p><span className="text-gray-500">Data:</span> <strong>{state.date}</strong></p>
          <p><span className="text-gray-500">Coach:</span> <strong>{state.coach}</strong></p>
          {state.playerCount > 1 && (
            <p><span className="text-gray-500">Giocatori:</span> <strong>{state.playerCount}</strong></p>
          )}
        </div>

        {/* Single player: show name + summary directly */}
        {state.playerCount === 1 && (
          <>
            <div className="space-y-1 text-sm mb-4">
              <p><span className="text-gray-500">Giocatore:</span> <strong>{state.players[0].name}</strong></p>
              <p><span className="text-gray-500">Categoria:</span> <strong>{state.players[0].category}</strong></p>
            </div>
            <PlayerSummary player={state.players[0]} label="" />
          </>
        )}

        {/* Multi-player: tab selector + summary per player */}
        {state.playerCount > 1 && (
          <>
            <div className="flex gap-1 mb-4 overflow-x-auto">
              {state.players.map((p, i) => {
                const rows = makeRows(p);
                const done = rows.every(r => r.done === r.total);
                return (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`flex items-center gap-1.5 py-2 px-3 rounded-xl border-2 text-sm font-semibold transition-all whitespace-nowrap
                      ${activeIdx === i
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                      }`}
                  >
                    {p.name || `G${i + 1}`}
                    {done
                      ? <span className={`text-xs ${activeIdx === i ? 'text-green-200' : 'text-green-600'}`}>✓</span>
                      : <span className={`w-2 h-2 rounded-full ${activeIdx === i ? 'bg-green-300' : 'bg-red-300'}`} />
                    }
                  </button>
                );
              })}
            </div>
            <div className="text-sm mb-3">
              <span className="text-gray-500">Categoria:</span>{' '}
              <strong>{state.players[activeIdx].category}</strong>
            </div>
            <PlayerSummary
              player={state.players[activeIdx]}
              label=""
            />
          </>
        )}
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onPrev}>← Indietro</Button>
        <Button className="flex-1 bg-green-700 hover:bg-green-800" onClick={onSave}>
          {state.playerCount > 1
            ? `Salva ${state.playerCount} sessioni`
            : 'Salva & Vedi Risultati'
          }
        </Button>
      </div>

      {!allDone && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 text-center">
          Alcune serie non sono complete. Torna indietro per completarle.
        </div>
      )}
    </div>
  );
};
