import React, { useState } from 'react';
import type { WizardState, WizardPlayerData, TestType } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { mean } from '../../lib/formulas';
import {
  GROUNDSTROKES_SERIES,
  COMBINED_SERIES,
  RETURN_SERIES,
  SERVE_SERIES,
  VOLLEY_SERIES, optionSeries, modulePasses, isOptionModule, moduleOption, MODULE_LABELS, MODULE_STEP_ORDER } from '../../lib/protocol';

interface Props {
  state: WizardState;
  onPrev: () => void;
  onSave: () => void;
  saving?: boolean;
  saveError?: string | null;
  onSaveDraft?: () => void;
  savingDraft?: boolean;
}

interface SummaryRow {
  label: string;
  testType: TestType;
  total: number;
  done: number;
  avg: number | null;
}

function makeRows(player: WizardPlayerData, selectedModules: TestType[], options: WizardState['strokeDirections'] = {}): SummaryRow[] {
  const make = (
    label: string,
    testType: TestType,
    specs: { testType: string; seriesIndex: number }[]
  ): SummaryRow => {
    const scores = specs
      .map(s => player.series.find(r => r.testType === s.testType && r.seriesIndex === s.seriesIndex)?.score)
      .filter(s => s !== undefined) as number[];
    return { label, testType, total: specs.length, done: scores.length, avg: scores.length > 0 ? mean(scores) : null };
  };

  const fixed: Partial<Record<TestType, SummaryRow[]>> = {
    groundstrokes: [
      make('Groundstrokes FH', 'groundstrokes', GROUNDSTROKES_SERIES.filter(s => s.direction === 'fh_cross')),
      make('Groundstrokes BH', 'groundstrokes', GROUNDSTROKES_SERIES.filter(s => s.direction === 'bh_cross')),
    ],
    combined: [make('Combined', 'combined', COMBINED_SERIES)],
    return: [make('Return', 'return', RETURN_SERIES)],
    serve: [make('Servizio', 'serve', SERVE_SERIES)],
    volley: [make('Volley', 'volley', VOLLEY_SERIES)],
  };
  const allRows: SummaryRow[] = MODULE_STEP_ORDER.flatMap(m => {
    if (isOptionModule(m)) {
      const opt = moduleOption(m, options[m]);
      return [make(`${MODULE_LABELS[m]} · ${opt.label.toLowerCase()}`, m, optionSeries(m, opt.id))];
    }
    return fixed[m] ?? [];
  });

  return allRows.filter(r => selectedModules.includes(r.testType));
}

const PlayerSummary: React.FC<{ player: WizardPlayerData; label: string; selectedModules: TestType[]; options: WizardState['strokeDirections'] }> = ({
  player,
  label,
  selectedModules,
  options,
}) => {
  const rows = makeRows(player, selectedModules, options);
  // A module can end early once passed (perfect-series threshold reached)
  const passed = new Set(modulePasses(player.series).filter(m => m.passed).map(m => m.module));
  const rowOk = (r: SummaryRow) => r.done === r.total || passed.has(r.testType);
  const allDone = rows.every(rowOk);

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
                  <span className={`font-bold ${rowOk(row) ? 'text-ok-600' : 'text-red-500'}`}>
                    {row.done}/{row.total}
                  </span>
                  {passed.has(row.testType) && <span className="ml-1 text-[10px] font-semibold text-ok-700">superato</span>}
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

export const StepReview: React.FC<Props> = ({ state, onPrev, onSave, saving = false, saveError = null, onSaveDraft, savingDraft = false }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  const allDone = state.players.every(p =>
    makeRows(p, state.selectedModules, state.strokeDirections).every(r => r.done === r.total)
  );

  return (
    <div className="space-y-4">
      <Card title="Riepilogo Sessione">
        <div className="space-y-1 text-sm mb-4">
          {state.challengeMode !== 'none' && (
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">
                🏆 Sfida {state.challengeMode.toUpperCase()}
              </span>
            </div>
          )}
          <p><span className="text-gray-500">Data:</span> <strong>{state.date}</strong></p>
          <p><span className="text-gray-500">Coach:</span> <strong>{state.coach || '—'}</strong></p>
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
              {state.players[0].dateOfBirth && (
                <p><span className="text-gray-500">Data di nascita:</span> <strong>{state.players[0].dateOfBirth}</strong></p>
              )}
              {state.players[0].note && (
                <p><span className="text-gray-500">Nota:</span> <em className="text-gray-700">{state.players[0].note}</em></p>
              )}
            </div>
            <PlayerSummary player={state.players[0]} label="" selectedModules={state.selectedModules} options={state.strokeDirections} />
          </>
        )}

        {/* Multi-player: tab selector + summary per player */}
        {state.playerCount > 1 && (
          <>
            <div className="flex gap-1 mb-4 overflow-x-auto">
              {state.players.map((p, i) => {
                const rows = makeRows(p, state.selectedModules, state.strokeDirections);
                const done = rows.every(r => r.done === r.total);
                return (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`flex items-center gap-1.5 py-2 px-3 rounded-xl border-2 text-sm font-semibold transition-all whitespace-nowrap
                      ${activeIdx === i
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-brand-400'
                      }`}
                  >
                    {p.name || `G${i + 1}`}
                    {done
                      ? <span className={`text-xs ${activeIdx === i ? 'text-brand-200' : 'text-brand-600'}`}>✓</span>
                      : <span className={`w-2 h-2 rounded-full ${activeIdx === i ? 'bg-brand-300' : 'bg-red-300'}`} />
                    }
                  </button>
                );
              })}
            </div>
            <div className="text-sm mb-3 space-y-1">
              <p><span className="text-gray-500">Categoria:</span> <strong>{state.players[activeIdx].category}</strong></p>
              {state.players[activeIdx].dateOfBirth && (
                <p><span className="text-gray-500">Data di nascita:</span> <strong>{state.players[activeIdx].dateOfBirth}</strong></p>
              )}
              {state.players[activeIdx].note && (
                <p><span className="text-gray-500">Nota:</span> <em className="text-gray-700">{state.players[activeIdx].note}</em></p>
              )}
            </div>
            <PlayerSummary
              player={state.players[activeIdx]}
              label=""
              selectedModules={state.selectedModules}
              options={state.strokeDirections}
            />
          </>
        )}
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onPrev} disabled={saving || savingDraft}>← Indietro</Button>
        {onSaveDraft && (
          <Button variant="secondary" className="flex-1" onClick={onSaveDraft} disabled={saving || savingDraft}>
            {savingDraft ? '⏳…' : 'Salva & Continua dopo'}
          </Button>
        )}
        <Button className="flex-1 bg-brand-700 hover:bg-brand-800" onClick={onSave} disabled={saving || savingDraft}>
          {saving
            ? '⏳ Salvataggio…'
            : state.challengeMode !== 'none'
              ? '🏆 Salva & Vedi Sfida'
              : state.playerCount > 1
                ? `Salva ${state.playerCount} sessioni`
                : 'Salva & Vedi Risultati'
          }
        </Button>
      </div>

      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 text-center">
          ⚠️ {saveError}
        </div>
      )}

      {!allDone && !saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 text-center">
          Alcune serie non sono complete. Torna indietro per completarle.
        </div>
      )}
    </div>
  );
};
