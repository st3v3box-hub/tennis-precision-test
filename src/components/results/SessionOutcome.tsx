import React from 'react';
import type { TestSession } from '../../types';
import { MODULE_LABELS, modulePasses, moduleDisplayName, OUTCOME_LABEL } from '../../lib/protocol';
import { describeZones, isStandardZones } from '../../lib/zones';
import { useAppData } from '../../contexts/AppDataContext';
import { CourtZones } from '../brand/CourtZones';
import { CATEGORY_TARGETS } from '../../lib/protocol';

/** Pass/fail of every module and the zones the test was played with. */
export const SessionOutcome: React.FC<{ session: TestSession }> = ({ session }) => {
  const { settings } = useAppData();
  const passes = modulePasses(session.series);
  const zones = session.zones ?? { level: session.category, measures: session.category === 'u10_u12' ? null : settings.zoneDefaults[session.category], standard: true };
  const d = describeZones(zones, session.category);
  const custom = !isStandardZones(session);
  const label = (m: (typeof passes)[number]['module']) => moduleDisplayName(session.series, m);

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-4 grid grid-cols-[88px_minmax(0,1fr)] gap-4 items-start">
      <CourtZones measures={zones.measures} level={zones.level} showLabels={false} className="w-full" title="Zone usate" />
      <div className="min-w-0 space-y-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-lg leading-tight">
              Zone {zones.level === 'u10_u12' ? 'U10/U12' : CATEGORY_TARGETS[zones.level].label}
            </h3>
            {custom
              ? <span className="text-[11px] font-semibold text-ball-ink bg-ball rounded-full px-2 py-0.5">personalizzate</span>
              : <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">standard</span>}
          </div>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            Fondo: {d.groundstroke}<br />Volée: {d.volley} · Servizio: {d.serve}
          </p>
        </div>
        {session.plannedModules && (
          <p className="text-xs text-gray-600">
            Test chiuso prima della fine. Non fatti: {session.plannedModules.filter(m => !passes.some(p => p.module === m)).map(m => MODULE_LABELS[m]).join(', ')}.
          </p>
        )}
        {passes.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {passes.map(p => (
              <li key={p.module}
                className={`text-xs rounded-lg px-2 py-1 border ${p.outcome === 'superato' ? 'bg-ok-50 border-ok-200 text-ok-800' : p.outcome === 'interrotto' ? 'bg-gray-50 border-gray-300 text-gray-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <strong>{label(p.module)}</strong> · {OUTCOME_LABEL[p.outcome]} ({p.perfect}/{p.required} perfette, {p.played} serie)
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
