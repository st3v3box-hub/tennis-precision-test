import { radarStrokes, familyAxes, familiesWithSpecials, strokeLabel, isBaseStroke } from '../../lib/formulas';
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import type { SessionResults, TestSession } from '../../types';
import {
  MODULE_SERIES, OUTCOME_LABEL, modulePasses, moduleDisplayName, isOptionModule, detectedOption, FAMILY_META,
  type ModulePass, type Family,
} from '../../lib/protocol';
import { CourtZones } from '../brand/CourtZones';
import { useFitWidth } from '../../lib/useFit';
import { describeZones, isStandardZones, withDropshot } from '../../lib/zones';
import { CATEGORY_TARGETS } from '../../lib/protocol';
import { useAppData } from '../../contexts/AppDataContext';

// Charts here use fixed sizes: they must print identically on A4, not follow the screen.

const GREEN = '#17663e';
const PALE = '#b3d5bc';

export function moduleTitle(session: TestSession, m: ModulePass['module']): string {
  return moduleDisplayName(session.series, m, session.moduleOptions);
}

const outcomeCls: Record<ModulePass['outcome'], string> = {
  superato: 'bg-ok-50 text-ok-800 border-ok-200',
  non_superato: 'bg-amber-50 text-amber-800 border-amber-200',
  interrotto: 'bg-gray-50 text-gray-700 border-gray-300',
};

/** A chart that fits the phone screen but keeps its A4 size when printed */
export const Fit: React.FC<{ printWidth: number; className?: string; children: (width: number) => React.ReactNode }> = ({ printWidth, className = 'w-full flex justify-center', children }) => {
  const { ref, width } = useFitWidth(printWidth);
  return <div ref={ref} className={className}>{children(width)}</div>;
};

/** Score of every series, module by module. Perfect series (10/10) in full green. */
export const SeriesBars: React.FC<{ session: TestSession; width?: number }> = ({ session, width: printWidth = 660 }) => {
  const passes = modulePasses(session.series);
  const { ref, width } = useFitWidth(printWidth);
  return (
    <div className="space-y-4" ref={ref}>
      {passes.map(p => {
        const data = session.series
          .filter(s => s.testType === p.module)
          .sort((a, b) => a.seriesIndex - b.seriesIndex)
          .map(s => ({ n: s.seriesIndex + 1, score: s.score }));
        const total = MODULE_SERIES[p.module];
        // Show the full protocol length so stopping early (passed / interrupted) is visible
        const padded = Array.from({ length: Math.max(total, data.length ? data[data.length - 1].n : 0) }, (_, i) =>
          data.find(d => d.n === i + 1) ?? { n: i + 1, score: null as number | null });
        return (
          <div key={p.module} className="break-inside-avoid">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-1">
              <p className="font-display font-bold text-base">{moduleTitle(session, p.module)}</p>
              <span className={`text-[11px] font-semibold border rounded-full px-2 py-0.5 ${outcomeCls[p.outcome]}`}>
                {OUTCOME_LABEL[p.outcome]} · {p.perfect}/{p.required} perfette · {p.played}/{total} serie
              </span>
            </div>
            <BarChart width={width} height={118} data={padded} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeeeee" vertical={false} />
              {/* On a narrow phone every other series number, so they don't overlap */}
              <XAxis dataKey="n" tick={{ fontSize: 9 }} tickLine={false} interval={width < 420 && padded.length > 12 ? 1 : 0} />
              <YAxis domain={[0, 10]} ticks={[0, 5, 10]} tick={{ fontSize: 9 }} tickLine={false} />
              <ReferenceLine y={10} stroke="#d4d4d4" />
              <Bar dataKey="score" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {padded.map(d => <Cell key={d.n} fill={d.score === 10 ? GREEN : PALE} />)}
              </Bar>
            </BarChart>
          </div>
        );
      })}
    </div>
  );
};

/** General radar (6 base strokes), optional comparison polygon (e.g. first test). */
export const RadarPrint: React.FC<{ results: SessionResults; compare?: SessionResults; size?: number }> = ({ results, compare, size: printSize = 300 }) => {
  const { ref, width: size } = useFitWidth(printSize);
  const axes = radarStrokes(results.stats, compare?.stats);
  const data = axes.map(stroke => {
    const st = results.stats.find(s => s.stroke === stroke)!;
    const cmp = compare?.stats.find(s => s.stroke === stroke);
    return {
      // Strokes not in this test stay on the radar at 0, marked "n.t." (non testato)
      stroke: st.scores.length > 0 ? st.label : `${st.label} (n.t.)`,
      value: Number(st.ave.toFixed(2)),
      compare: cmp ? Number(cmp.ave.toFixed(2)) : undefined,
    };
  });
  return (
    <div ref={ref} className="w-full flex justify-center">
    <RadarChart width={size} height={size * 0.8} data={data} outerRadius={size * 0.27} margin={{ top: 4, right: 36, bottom: 4, left: 36 }}>
      <PolarGrid stroke="#e5e5e5" />
      <PolarAngleAxis dataKey="stroke" tick={{ fontSize: 10, fill: '#404040' }} />
      <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
      {compare && <Radar dataKey="compare" stroke="#a3a3a3" fill="#a3a3a3" fillOpacity={0.15} strokeDasharray="4 3" isAnimationActive={false} />}
      <Radar dataKey="value" stroke={GREEN} fill={GREEN} fillOpacity={0.25} strokeWidth={2} isAnimationActive={false} />
    </RadarChart>
    </div>
  );
};

const f1 = (v: number) => v.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * One chart per family with special strokes tested (fondo, rete, sensibilità), in the family colour:
 * a radar with 3+ strokes, bars otherwise. Optional comparison (grey, dashed).
 */
export const FamilyCharts: React.FC<{ results: SessionResults; compare?: SessionResults; size?: number }> = ({ results, compare, size = 260 }) => {
  const fams = familiesWithSpecials(results.stats, compare?.stats);
  if (fams.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fams.map(f => <FamilyChart key={f} family={f} results={results} compare={compare} size={size} />)}
    </div>
  );
};

const FamilyChart: React.FC<{ family: Family; results: SessionResults; compare?: SessionResults; size: number }> = ({ family, results, compare, size: printSize }) => {
  const { ref, width: size } = useFitWidth(printSize);
  const meta = FAMILY_META[family];
  const axes = familyAxes(family, results.stats, compare?.stats);
  const ave = (list: SessionResults | undefined, st: string) => list?.stats.find(s => s.stroke === st);
  return (
    <div className="break-inside-avoid min-w-0" ref={ref}>
      <p className={`flex items-center gap-2 font-display font-bold ${meta.ink}`}>
        <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} aria-hidden />{meta.label}
      </p>
      {axes.length >= 3 ? (
        <RadarChart width={size} height={size * 0.8} outerRadius={size * 0.27} margin={{ top: 4, right: 30, bottom: 4, left: 30 }}
          data={axes.map(a => {
            const st = ave(results, a);
            const c = ave(compare, a);
            return {
              stroke: st && st.scores.length > 0 ? strokeLabel(a) : `${strokeLabel(a)} (n.t.)`,
              value: Number((st?.ave ?? 0).toFixed(2)),
              compare: c && c.scores.length > 0 ? Number(c.ave.toFixed(2)) : undefined,
            };
          })}>
          <PolarGrid stroke="#e5e5e5" />
          <PolarAngleAxis dataKey="stroke" tick={{ fontSize: 10, fill: '#404040' }} />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          {compare && <Radar dataKey="compare" stroke="#a3a3a3" fill="#a3a3a3" fillOpacity={0.15} strokeDasharray="4 3" isAnimationActive={false} />}
          <Radar dataKey="value" stroke={meta.color} fill={meta.color} fillOpacity={0.25} strokeWidth={2} isAnimationActive={false} />
        </RadarChart>
      ) : (
        <div className="space-y-2.5 mt-2">
          {axes.map(a => {
            const st = ave(results, a);
            const c = ave(compare, a);
            const tested = !!st && st.scores.length > 0;
            return (
              <div key={a}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-semibold">{strokeLabel(a)}</span>
                  <span className="font-display font-extrabold text-xl">{tested ? f1(st!.ave) : 'n.t.'}<span className="text-xs text-gray-400"> /10</span></span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden mt-1 relative">
                  <div className="h-full rounded-full" style={{ width: `${(st?.ave ?? 0) * 10}%`, background: meta.color }} />
                </div>
                {c && c.scores.length > 0 && <p className="text-[11px] text-gray-500 mt-0.5">prima: {f1(c.ave)}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** Per-stroke metrics: average, spread, perfect series, balls on target. */
export const StrokeMetricsTable: React.FC<{ results: SessionResults }> = ({ results }) => {
  const tested = results.stats.filter(st => st.scores.length > 0);
  return (
    <div className="overflow-x-auto -mx-1 px-1">
    <table className="w-full text-xs sm:text-sm print:text-sm">
      <thead>
        <tr className="text-[11px] text-gray-500 text-left">
          <th className="font-medium pb-1">Colpo</th>
          <th className="font-medium pb-1 text-right">Media</th>
          <th className="font-medium pb-1 text-right">Costanza ±</th>
          <th className="font-medium pb-1 text-right">10/10</th>
          <th className="font-medium pb-1 text-right">Palle dentro</th>
        </tr>
      </thead>
      <tbody>
        {tested.map(st => {
          const inside = st.scores.reduce((a, b) => a + b, 0);
          return (
            <tr key={st.stroke} className="border-t border-gray-100">
              <td className="py-1.5">{st.label}</td>
              <td className={`py-1.5 text-right font-bold ${st.ave >= 8 ? 'text-ok-600' : st.ave >= 5 ? 'text-yellow-600' : 'text-red-500'}`}>{f1(st.ave)}</td>
              <td className="py-1.5 text-right text-gray-600">{f1(st.dev)}</td>
              <td className="py-1.5 text-right text-gray-600">{st.perfectCount}/{st.scores.length}</td>
              <td className="py-1.5 text-right text-gray-600 whitespace-nowrap">{inside}/{st.scores.length * 10}<span className="block text-[10px] text-gray-500">{Math.round((inside / (st.scores.length * 10)) * 100)}%</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
};

/** Court with the zones the test was played with, plus a text description. */
export const ZonesPanel: React.FC<{ session: TestSession; width?: number }> = ({ session, width = 210 }) => {
  const { settings } = useAppData();
  const zones = session.zones ?? {
    level: session.category,
    measures: session.category === 'u10_u12' ? null : settings.zoneDefaults[session.category],
    standard: true,
  };
  const d = describeZones(zones, session.category);
  const played = modulePasses(session.series).map(p => p.module);
  // Groundstroke box on the side targeted by the (first) module with a chosen direction, if any
  const optMod = played.filter(isOptionModule).find(m => detectedOption(session.series, m).target.zone === 'groundstroke');
  const lineFH = optMod ? detectedOption(session.series, optMod).target.mirror : false;
  const hasDropshot = played.includes('dropshot');
  const measures = zones.measures ? withDropshot(zones.measures, zones.level, settings.zoneDefaults) : null;
  return (
    <div className="flex flex-col min-[480px]:flex-row print:flex-row gap-4 items-start">
      <div style={{ width }} className="flex-shrink-0 max-w-full self-center min-[480px]:self-start print:self-start">
        <CourtZones measures={measures} level={zones.level} mirror={lineFH} className="w-full" title="Zone del test"
          only={hasDropshot ? ['groundstroke', 'volley', 'serve', 'dropshot'] : undefined} />
      </div>
      <div className="text-sm text-gray-700 space-y-1.5 min-w-0">
        <p className="font-display font-bold text-base text-ink">
          Zone {zones.level === 'u10_u12' ? 'U10/U12' : CATEGORY_TARGETS[zones.level].label}
          <span className="ml-2 text-[11px] font-semibold align-middle rounded-full px-2 py-0.5 bg-gray-100 text-gray-600">
            {isStandardZones(session) ? 'standard' : 'personalizzate'}
          </span>
        </p>
        <p><span className="text-gray-500">Colpi da fondo:</span> {d.groundstroke}</p>
        <p><span className="text-gray-500">Volée:</span> {d.volley}</p>
        <p><span className="text-gray-500">Servizio:</span> {d.serve}</p>
        {hasDropshot && <p><span className="text-gray-500">Smorzata:</span> {d.dropshot}</p>}
        <p className="text-xs text-gray-500 pt-1">In giallo le zone bersaglio. Le distanze sono misurate dalla linea centrale e dalla linea del servizio.</p>
      </div>
    </div>
  );
};

export const REPORT_PRINT_CSS = `
  @page { size: A4; margin: 10mm; }
  @media print {
    .no-print { display: none !important; }
    body { background: #fff !important; }
    .report-sheet { box-shadow: none !important; margin: 0 !important; width: 100% !important; padding: 0 !important; }
  }
  .report-sheet, .report-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
`;

/** For tests with fewer than 3 base strokes the radar says little: one bar per tested base stroke too. */
export const StrokeBarsPrint: React.FC<{ results: SessionResults }> = ({ results }) => (
  <div className="space-y-3 py-2">
    {results.stats.filter(st => isBaseStroke(st.stroke) && st.scores.length > 0).map(st => (
      <div key={st.stroke}>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">{st.label}</span>
          <span className="font-display font-extrabold text-2xl">{f1(st.ave)}<span className="text-sm text-gray-400"> /10</span></span>
        </div>
        <div className="h-3 rounded-full bg-gray-100 overflow-hidden mt-1">
          <div className="h-full rounded-full" style={{ width: `${st.ave * 10}%`, background: GREEN }} />
        </div>
      </div>
    ))}
    <p className="text-[11px] text-gray-500">n.t. = colpo non testato in questa sessione.</p>
  </div>
);
