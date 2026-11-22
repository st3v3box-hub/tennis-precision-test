import React, { useState } from 'react';
import type { AppSettings, ZoneCategory, ZoneMeasures } from '../../types';
import { CATEGORY_TARGETS } from '../../lib/protocol';
import { PROTOCOL_ZONES, ZONE_CATEGORIES, clampMeasures, limitsFor, sameMeasures } from '../../lib/zones';
import { getCredentials } from '../../lib/auth';
import { CourtZones } from '../brand/CourtZones';

interface Props {
  settings: AppSettings;
  onSave: (patch: Partial<AppSettings>) => Promise<void> | void;
}

const FIELDS: { key: keyof ZoneMeasures; label: string }[] = [
  { key: 'gsFromCenter', label: 'Fondo · dalla centrale' },
  { key: 'gsFromService', label: 'Fondo · dal servizio' },
  { key: 'volley', label: 'Volée · striscia' },
  { key: 'serve', label: 'Servizio · strisce' },
];

const fmt = (v: number) => v.toLocaleString('it-IT', { maximumFractionDigits: 2 });
const LOG_MAX = 50;

/** Academy default zones per category. Every change is logged with who and when. */
export const ZoneDefaultsEditor: React.FC<Props> = ({ settings, onSave }) => {
  const [cat, setCat] = useState<ZoneCategory>('seconda');
  const [draft, setDraft] = useState<ZoneMeasures>(settings.zoneDefaults[cat]);
  const saved = settings.zoneDefaults[cat];
  const dirty = !sameMeasures(draft, saved);
  const lim = limitsFor(cat);

  const pick = (c: ZoneCategory) => { setCat(c); setDraft(settings.zoneDefaults[c]); };

  const save = async (after: ZoneMeasures) => {
    const clean = clampMeasures(after, cat);
    if (sameMeasures(clean, saved)) return;
    const entry = { at: new Date().toISOString(), by: getCredentials()?.username || 'sconosciuto', category: cat, before: saved, after: clean };
    await onSave({
      zoneDefaults: { ...settings.zoneDefaults, [cat]: clean },
      zoneLog: [entry, ...settings.zoneLog].slice(0, LOG_MAX),
    });
    setDraft(clean);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1.5">
        {ZONE_CATEGORIES.map(c => (
          <button key={c} type="button" onClick={() => pick(c)}
            className={`py-2 rounded-lg border-2 text-sm font-semibold ${cat === c ? 'bg-pitch border-pitch text-white' : 'bg-white border-gray-200 text-ink'}`}>
            {CATEGORY_TARGETS[c].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 items-start">
        <CourtZones measures={draft} level={cat} className="w-full" />
        <div className="space-y-2">
          {FIELDS.map(f => (
            <label key={`${cat}-${f.key}`} className="block">
              <span className="block text-[11px] font-medium text-gray-600">{f.label}</span>
              <span className="flex items-center gap-1 mt-0.5">
                <input type="number" inputMode="decimal" step={0.05} min={lim[f.key][0]} max={lim[f.key][1]}
                  value={draft[f.key]}
                  onChange={e => {
                    const n = Number(e.target.value.replace(',', '.'));
                    if (Number.isFinite(n)) setDraft(d => ({ ...d, [f.key]: n }));
                  }}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <span className="text-xs text-gray-500">m</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" disabled={!dirty} onClick={() => save(draft)}
          className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold disabled:opacity-40">
          Salva zone {CATEGORY_TARGETS[cat].label}
        </button>
        {!sameMeasures(saved, PROTOCOL_ZONES[cat]) && (
          <button type="button" onClick={() => save(PROTOCOL_ZONES[cat])}
            className="px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-ink">
            Valori del protocollo
          </button>
        )}
      </div>
      <p className="text-[11px] text-gray-500">
        Le modifiche valgono per i test nuovi. I test già fatti conservano le zone con cui sono stati giocati.
      </p>

      {settings.zoneLog.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1.5">Ultime modifiche</p>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white text-xs">
            {settings.zoneLog.slice(0, 8).map((e, i) => (
              <li key={i} className="px-3 py-2">
                <span className="font-semibold text-ink">{e.by}</span>
                <span className="text-gray-500"> · {new Date(e.at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })} · {CATEGORY_TARGETS[e.category].label}</span>
                <span className="block text-gray-600 mt-0.5">
                  {FIELDS.filter(f => Math.abs(e.before[f.key] - e.after[f.key]) >= 0.005)
                    .map(f => `${f.label}: ${fmt(e.before[f.key])} → ${fmt(e.after[f.key])} m`).join('; ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
