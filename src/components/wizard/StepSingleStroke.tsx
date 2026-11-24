import React, { useState } from 'react';
import type { WizardState, SeriesResult } from '../../types';
import {
  optionSeries, moduleOption, MODULE_PASS, MODULE_LABELS, MODULE_SERIES, MODULE_FAMILY, FAMILY_META, isPairModule,
  type OptionModule,
} from '../../lib/protocol';
import { resolveSessionZones, withDropshot } from '../../lib/zones';
import { useAppData } from '../../contexts/AppDataContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SeriesInputBlock } from './SeriesInputBlock';
import { PlayerTabBar } from './PlayerTabBar';
import { CourtZones } from '../brand/CourtZones';

interface Props {
  module: OptionModule;
  state: WizardState;
  setSeriesResult: (playerIdx: number, r: SeriesResult) => void;
  onNext: () => void;
  onPrev: () => void;
}

/** How the ball is fed, per module */
const FEED: Record<OptionModule, string> = {
  forehand: '10 palle dal cesto sul dritto',
  backhand: '10 palle dal cesto sul rovescio',
  insideout: 'Palla dal cesto sul lato del rovescio, il giocatore gira intorno e colpisce di dritto',
  slice: '10 palle dal cesto, colpite in back',
  putaway: 'Palla corta e alta dal cesto, da chiudere vincente di dritto',
  volley: '10 palle a rete, volée incrociate',
  approach: '5 coppie: palla corta da attaccare, poi una volée. La coppia vale se entrano tutti e due i colpi',
  smash_volo: 'Pallonetto dal cesto, smash al volo',
  smash_rimbalzo: 'Pallonetto alto dal cesto, smash dopo il rimbalzo',
  dropshot: '10 palle dal cesto, dritto e rovescio alternati, smorzata nel quadrato vicino alla rete',
};

/**
 * Every module played with one option for the whole test (solo dritto, solo rovescio,
 * sventaglio, back, chiusura, attacco e volée, smash, smorzata): 20 series from the basket,
 * passed with 10 perfect series; the coach can move on as soon as the 10th is reached.
 */
export const StepSingleStroke: React.FC<Props> = ({ module, state, setSeriesResult, onNext, onPrev }) => {
  const { settings } = useAppData();
  const [activeIdx, setActiveIdx] = useState(0);
  const option = moduleOption(module, state.strokeDirections[module]);
  const specs = optionSeries(module, option.id);
  const total = MODULE_SERIES[module];
  const required = MODULE_PASS[module];
  const family = FAMILY_META[MODULE_FAMILY[module]];

  const own = (pidx: number) => state.players[pidx].series.filter(r => r.testType === module);
  const perfect = (pidx: number) => own(pidx).filter(r => r.score === 10).length;
  const filled = (pidx: number) => specs.filter(s => own(pidx).some(r => r.seriesIndex === s.seriesIndex)).length;
  const ready = (pidx: number) => filled(pidx) === specs.length || perfect(pidx) >= required;

  const completedFlags = state.players.map((_, i) => ready(i));
  const canContinue = completedFlags.every(Boolean);
  const active = state.players[activeIdx];
  const activePerfect = perfect(activeIdx);
  const activeFilled = filled(activeIdx);
  const zones = resolveSessionZones(active.category, active.zones, settings.zoneDefaults);
  const measures = zones.measures ? withDropshot(zones.measures, zones.level, settings.zoneDefaults) : null;
  const playerLabel = state.playerCount > 1 ? ` — ${active.name || `Giocatore ${activeIdx + 1}`}` : '';
  const target = option.target;

  // Once passed, the series that would come after are not shown
  const lastNeeded = activePerfect >= required ? activeFilled : specs.length;

  return (
    <div className="space-y-4">
      <PlayerTabBar players={state.players} activeIdx={activeIdx} completedFlags={completedFlags} onChange={setActiveIdx} />

      <Card title={`${MODULE_LABELS[module]} · ${option.label.toLowerCase()}${playerLabel}`}
        subtitle={`${FEED[module]} · ${total} serie · superato con ${required} perfette${isPairModule(module) ? ' (5 coppie su 5)' : ''}`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-shrink-0">
            <span className={`block text-[10px] font-bold rounded-full px-2 py-0.5 mb-1 text-center ${family.soft}`}>{family.label}</span>
            <CourtZones
              measures={measures} level={zones.level}
              focus={target.zone === 'dropshot' ? 'dropshot' : target.zone === 'volley' ? 'volley' : 'groundstroke'}
              only={target.zone === 'dropshot' ? ['dropshot'] : target.zone === 'volley' ? ['volley'] : target.zone === 'approach' ? ['groundstroke', 'volley'] : ['groundstroke']}
              bothCorners={target.zone === 'approach'}
              mirror={target.mirror}
              showLabels={false} className="h-24 w-auto" title="Zona bersaglio" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Serie perfette</p>
            <p className="font-display text-4xl font-extrabold leading-none">
              {activePerfect}<span className="text-gray-300 text-2xl"> / {required}</span>
            </p>
            <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-brand-600 transition-all" style={{ width: `${Math.min(100, (activePerfect / required) * 100)}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{activeFilled} di {total} serie giocate</p>
          </div>
        </div>
        <SeriesInputBlock
          specs={specs.slice(0, Math.max(lastNeeded, 1))}
          series={active.series}
          onSet={r => setSeriesResult(activeIdx, r)}
        />
      </Card>

      {activePerfect >= required && (
        <div className="p-3 bg-ok-50 border border-ok-300 rounded-xl text-sm text-ok-800">
          <strong>Test superato</strong> in {activeFilled} serie. Puoi passare al modulo successivo.
        </div>
      )}
      {activeFilled === specs.length && activePerfect < required && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <strong>Test non superato</strong>: {activePerfect} serie perfette su {required}. I punteggi contano comunque nei grafici.
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onPrev}>Indietro</Button>
        <Button className="flex-1" disabled={!canContinue} onClick={onNext}>Avanti</Button>
      </div>
      {!canContinue && state.playerCount > 1 && (
        <p className="text-center text-xs text-gray-500">{completedFlags.filter(Boolean).length}/{state.playerCount} giocatori pronti</p>
      )}
    </div>
  );
};
