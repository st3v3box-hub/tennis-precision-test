import React, { useState } from 'react';
import type { TestType, WizardState } from '../../types';
import { MODULE_LABELS, MODULE_STEP_ORDER, moduleDone } from '../../lib/protocol';

interface Props {
  state: WizardState;
  module: TestType;
  busy: boolean;
  /** Close the test now with what has been played (completed, possibly partial / interrupted) */
  onFinish: () => void;
  /** Save as "in progress" to resume later */
  onPause: () => void;
  onNext: () => void;
}

/**
 * Under every module step: when the module is finished, offer "next module" or
 * "finish here"; at any moment, "stop" with the choice close-and-save or pause.
 */
export const ModuleActions: React.FC<Props> = ({ state, module, busy, onFinish, onPause, onNext }) => {
  const [sheet, setSheet] = useState(false);
  const remaining = MODULE_STEP_ORDER.filter(m => state.selectedModules.includes(m));
  const nextModule = remaining[remaining.indexOf(module) + 1];
  const allDone = state.players.every(p => moduleDone(p.series, module));
  const anySeries = state.players.some(p => p.series.some(r => state.selectedModules.includes(r.testType)));

  return (
    <>
      {allDone && nextModule && (
        <div className="mt-4 rounded-2xl bg-pitch text-white p-4">
          <p className="font-display font-bold text-lg leading-tight">{MODULE_LABELS[module]} completato</p>
          <p className="text-sm text-chalk/80 mt-0.5">Vuoi continuare con {MODULE_LABELS[nextModule]} o chiudere il test qui?</p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button type="button" onClick={onNext} disabled={busy}
              className="py-3 rounded-xl bg-white text-pitch font-bold text-sm">Continua con {MODULE_LABELS[nextModule]}</button>
            <button type="button" onClick={onFinish} disabled={busy}
              className="py-3 rounded-xl ring-1 ring-white/40 text-white font-bold text-sm">{busy ? 'Salvataggio…' : 'Termina e salva'}</button>
          </div>
        </div>
      )}

      {!(allDone && nextModule) && (
        <button type="button" onClick={() => setSheet(true)} disabled={busy}
          className="mt-4 w-full py-3 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-ink hover:bg-gray-50">
          Interrompi il test…
        </button>
      )}

      {sheet && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setSheet(false)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-8 space-y-3" onClick={e => e.stopPropagation()}
            role="dialog" aria-label="Interrompi il test">
            <p className="font-display font-bold text-xl">Interrompi il test</p>
            <p className="text-sm text-gray-600">Pioggia, buio, tempo finito? Scegli cosa fare con le serie già inserite.</p>
            <button type="button" disabled={busy || !anySeries} onClick={() => { setSheet(false); onFinish(); }}
              className="w-full text-left rounded-2xl border-2 border-brand-600 bg-brand-600 text-white px-4 py-3 disabled:opacity-40">
              <span className="block font-bold">Chiudi e salva così</span>
              <span className="block text-xs text-brand-100">Il test è concluso: contano le serie fatte, con esito "interrotto" o "parziale". Va in classifica.</span>
            </button>
            <button type="button" disabled={busy} onClick={() => { setSheet(false); onPause(); }}
              className="w-full text-left rounded-2xl border-2 border-gray-200 px-4 py-3">
              <span className="block font-bold text-ink">Metti in pausa</span>
              <span className="block text-xs text-gray-500">Resta in "Test in corso": lo riprendi un altro giorno da dove sei rimasto.</span>
            </button>
            <button type="button" onClick={() => setSheet(false)} className="w-full py-3 text-sm font-semibold text-gray-500">Continua il test</button>
            {!anySeries && <p className="text-xs text-gray-500">Per chiudere il test serve almeno una serie inserita.</p>}
          </div>
        </div>
      )}
    </>
  );
};
