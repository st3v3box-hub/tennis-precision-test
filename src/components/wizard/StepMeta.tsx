import React from 'react';
import type { WizardState, WizardPlayerData, Category } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CATEGORY_OPTIONS, CATEGORY_TARGETS } from '../../lib/protocol';

interface Props {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
  updatePlayer: (idx: number, patch: Partial<WizardPlayerData>) => void;
  setPlayerCount: (count: 1 | 2 | 3 | 4) => void;
  onNext: () => void;
}

const CategoryDiagram: React.FC<{ cat: Category }> = ({ cat }) => {
  const t = CATEGORY_TARGETS[cat];
  return (
    <div className="mt-3 bg-gray-50 rounded-xl p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{t.label}</p>
      <p className="text-gray-500 text-xs mb-2">{t.description}</p>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-white rounded-lg p-2 border border-gray-200">
          <div className="text-gray-500 mb-1">Groundstroke</div>
          <div className="font-semibold text-green-700">{t.groundstroke}</div>
        </div>
        <div className="bg-white rounded-lg p-2 border border-gray-200">
          <div className="text-gray-500 mb-1">Volley</div>
          <div className="font-semibold text-blue-700">{t.volley}</div>
        </div>
        <div className="bg-white rounded-lg p-2 border border-gray-200">
          <div className="text-gray-500 mb-1">Servizio</div>
          <div className="font-semibold text-orange-700">{t.serve}</div>
        </div>
      </div>
    </div>
  );
};

export const StepMeta: React.FC<Props> = ({ state, update, updatePlayer, setPlayerCount, onNext }) => {
  const canContinue =
    state.players.every(p => p.name.trim().length > 0) &&
    state.date.length > 0 &&
    state.coach.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Player count selector */}
      <Card title="Numero di Giocatori">
        <p className="text-xs text-gray-500 mb-3">Seleziona quanti giocatori partecipano al test</p>
        <div className="grid grid-cols-4 gap-2">
          {([1, 2, 3, 4] as const).map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setPlayerCount(n)}
              className={`py-3 rounded-xl border-2 text-xl font-bold transition-all
                ${state.playerCount === n
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                }`}
            >
              {n}
            </button>
          ))}
        </div>
      </Card>

      {/* Per-player inputs */}
      {state.players.map((p, i) => (
        <Card
          key={i}
          title={state.playerCount > 1 ? `Giocatore ${i + 1}` : 'Dati Giocatore'}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input
                type="text"
                value={p.name}
                onChange={e => updatePlayer(i, { name: e.target.value })}
                placeholder="Es. Mario Rossi"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria / Livello</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updatePlayer(i, { category: opt.value })}
                    className={`py-2 rounded-xl border-2 text-sm font-semibold transition-all
                      ${p.category === opt.value
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* Show diagram only for single player to keep multi-player UI compact */}
              {state.playerCount === 1 && <CategoryDiagram cat={p.category} />}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data di Nascita</label>
              <input
                type="date"
                value={p.dateOfBirth ?? ''}
                onChange={e => updatePlayer(i, { dateOfBirth: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nota <span className="text-gray-400 font-normal">(opzionale)</span>
              </label>
              <textarea
                value={p.note ?? ''}
                onChange={e => updatePlayer(i, { note: e.target.value || undefined })}
                placeholder="Es. stato di forma, osservazioni tecniche..."
                rows={2}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
          </div>
        </Card>
      ))}

      {/* Shared session info */}
      <Card title="Dati Sessione">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coach *</label>
            <input
              type="text"
              value={state.coach}
              onChange={e => update({ coach: e.target.value })}
              placeholder="Es. Luigi Bianchi"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <input
              type="date"
              value={state.date}
              onChange={e => update({ date: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </Card>

      <Button size="lg" className="w-full" disabled={!canContinue} onClick={onNext}>
        Inizia Test →
      </Button>
    </div>
  );
};
