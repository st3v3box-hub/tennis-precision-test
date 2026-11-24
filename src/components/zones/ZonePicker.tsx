import React, { useState } from 'react';
import type { Category, SessionZones, ZoneCategory, ZoneMeasures } from '../../types';
import { CATEGORY_OPTIONS, CATEGORY_TARGETS } from '../../lib/protocol';
import {
  DIFFICULTY_MAX, DIFFICULTY_MIN, clampMeasures, difficultyLabel, difficultyOf, limitsFor,
  measuresAtDifficulty, resolveSessionZones, zonesForLevel,
} from '../../lib/zones';
import { CourtZones, ALL_ZONES, type ZoneKind } from '../brand/CourtZones';

type Choice = Omit<SessionZones, 'standard'>;

interface Props {
  /** The player's category: decides the default zones */
  category: Category;
  /** Current custom choice, undefined = category defaults */
  value: Choice | undefined;
  onChange: (c: Choice | undefined) => void;
  defaults: Record<ZoneCategory, ZoneMeasures>;
}

const FIELDS: { key: keyof ZoneMeasures; label: string; hint: string; zone: ZoneKind }[] = [
  { key: 'gsFromCenter', label: 'Fondo · dalla linea centrale', hint: 'più alto = zona più stretta', zone: 'groundstroke' },
  { key: 'gsFromService', label: 'Fondo · dalla linea del servizio', hint: 'più alto = zona più corta', zone: 'groundstroke' },
  { key: 'volley', label: 'Volée · larghezza striscia', hint: 'più alto = più facile', zone: 'volley' },
  { key: 'serve', label: 'Servizio · larghezza strisce', hint: 'più alto = più facile', zone: 'serve' },
  { key: 'dropshot', label: 'Smorzata · lato del quadrato', hint: 'più alto = più facile', zone: 'dropshot' },
];

const fmt = (v: number) => v.toLocaleString('it-IT', { maximumFractionDigits: 2 });

/**
 * Per-player target zones: start from the category, pick another level,
 * move the easy ↔ hard slider, or type exact measures. The court redraws live.
 */
export const ZonePicker: React.FC<Props> = ({ category, value, onChange, defaults }) => {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState<ZoneKind | undefined>(undefined);
  const resolved = resolveSessionZones(category, value, defaults);
  const level = resolved.level;
  const m = resolved.measures;
  const d = m ? difficultyOf(m, defaults) : null;

  const set = (choice: Choice) => {
    const r = resolveSessionZones(category, choice, defaults);
    onChange(r.standard ? undefined : choice); // back to defaults → no custom choice stored
  };
  const setLevel = (l: Category) => set(zonesForLevel(l, defaults));
  const setDifficulty = (v: number) => {
    if (level === 'u10_u12') return;
    set({ level, measures: measuresAtDifficulty(v, defaults, level) });
  };
  const setField = (k: keyof ZoneMeasures, raw: string) => {
    if (!m) return;
    const n = Number(raw.replace(',', '.'));
    if (!Number.isFinite(n)) return;
    set({ level, measures: clampMeasures({ ...m, [k]: n }, level) });
  };

  const lim = limitsFor(level);
  const summary = level === 'u10_u12'
    ? 'Aree pari / dispari'
    : `${CATEGORY_TARGETS[level].label}${d !== null && !resolved.standard && value?.level === level && !sameAsLevel(m, defaults, level) ? ' · misure personalizzate' : ''}`;

  return (
    <div className="rounded-xl border border-black/[0.08] overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left bg-chalk/60 hover:bg-chalk" aria-expanded={open}>
        <CourtZones measures={m} level={level} showLabels={false} className="h-12 w-auto flex-shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-ink">Zone bersaglio</span>
          <span className="block text-xs text-gray-600 truncate">{summary}</span>
        </span>
        {resolved.standard
          ? <span className="text-[11px] font-semibold text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">standard</span>
          : <span className="text-[11px] font-semibold text-ball-ink bg-ball rounded-full px-2 py-0.5">personalizzate</span>}
        <span className="text-gray-400 text-sm" aria-hidden>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="p-3 space-y-4 bg-white">
          <CourtZones measures={m} level={level} focus={focus} only={ALL_ZONES} className="w-full max-w-[300px] mx-auto block"
            title={`Zone ${level === 'u10_u12' ? 'U10/U12' : CATEGORY_TARGETS[level].label}`} />

          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">Parti dalle zone di</p>
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORY_OPTIONS.map(o => (
                <button key={o.value} type="button" onClick={() => setLevel(o.value)}
                  className={`py-2 rounded-lg border-2 text-xs font-semibold transition-colors
                    ${level === o.value ? 'bg-pitch border-pitch text-white' : 'bg-white border-gray-200 text-ink hover:border-brand-400'}`}>
                  {o.label}{o.value === category ? ' ●' : ''}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">● = categoria del giocatore</p>
          </div>

          {m && d !== null && (
            <>
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <label htmlFor={`diff-${category}`} className="text-xs font-medium text-gray-600">Facile ↔ difficile</label>
                  <span className="text-xs font-semibold text-ink">{difficultyLabel(d)}</span>
                </div>
                <input id={`diff-${category}`} type="range" min={DIFFICULTY_MIN} max={DIFFICULTY_MAX} step={0.05} value={d}
                  onChange={e => setDifficulty(Number(e.target.value))}
                  className="w-full accent-brand-600" />
                <div className="relative h-4 text-[10px] text-gray-500">
                  {[['3ª', 0], ['2ª', 1], ['1ª', 2]].map(([lab, pos]) => (
                    <span key={lab} className="absolute -translate-x-1/2"
                      style={{ left: `${((Number(pos) - DIFFICULTY_MIN) / (DIFFICULTY_MAX - DIFFICULTY_MIN)) * 100}%` }}>{lab}</span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {FIELDS.map(f => (
                  <label key={f.key} className="block" onFocus={() => setFocus(f.zone)} onBlur={() => setFocus(undefined)}>
                    <span className="block text-[11px] font-medium text-gray-600 leading-tight">{f.label}</span>
                    <span className="flex items-center gap-1 mt-1">
                      <input type="number" inputMode="decimal" step={0.05} min={lim[f.key][0]} max={lim[f.key][1]}
                        key={`${f.key}-${m[f.key]}`} defaultValue={m[f.key]}
                        onBlur={e => setField(f.key, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      <span className="text-xs text-gray-500">m</span>
                    </span>
                    <span className="block text-[10px] text-gray-400 mt-0.5">{f.hint}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {!resolved.standard && (
            <button type="button" onClick={() => onChange(undefined)}
              className="w-full py-2 rounded-lg border border-gray-300 text-sm font-semibold text-ink hover:bg-gray-50">
              Torna alle zone {category === 'u10_u12' ? 'U10/U12' : `di ${CATEGORY_TARGETS[category].label}`}
            </button>
          )}
          {m && (
            <p className="text-[11px] text-gray-500">
              Zona di fondo: {fmt(Math.max(0, 4.115 - m.gsFromCenter))} m × {fmt(Math.max(0, 5.485 - m.gsFromService))} m.
              {!resolved.standard && ' I test con zone personalizzate restano fuori da classifiche e obiettivi, salvo diversa impostazione.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

function sameAsLevel(m: ZoneMeasures | null, defaults: Record<ZoneCategory, ZoneMeasures>, level: Category): boolean {
  if (!m || level === 'u10_u12') return true;
  const ref = defaults[level];
  return (Object.keys(ref) as (keyof ZoneMeasures)[]).every(k => Math.abs(ref[k] - m[k]) < 0.005);
}
