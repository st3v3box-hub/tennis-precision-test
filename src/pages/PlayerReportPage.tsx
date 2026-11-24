import { radarStrokes, familiesWithSpecials } from '../lib/formulas';
import { SeriesBars, StrokeMetricsTable, ZonesPanel, FamilyCharts, Fit } from '../components/report/ReportBlocks';
import { BrandLockup } from '../components/brand/BrandLockup';
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine,
} from 'recharts';
import { useAppData } from '../contexts/AppDataContext';
import { computeSessionResults } from '../lib/formulas';
import { percentToStars, renderStars, STAR_LABELS } from '../lib/stars';
import { CATEGORY_TARGETS, sessionPassed } from '../lib/protocol';
import { playerObjective, compareWithGroup } from '../lib/objectives';
import { ObjectiveCard } from '../components/player/ObjectiveCard';
import { GroupComparisonCard } from '../components/player/GroupComparisonCard';
import { KillerSummaryCard } from '../components/player/KillerSummaryCard';
import { Card } from '../components/ui/Card';

function calcAge(dob: string): number | null {
  const d = new Date(dob);
  if (!dob || Number.isNaN(d.getTime())) return null;
  const ref = new Date();
  let age = ref.getFullYear() - d.getFullYear();
  if (ref.getMonth() < d.getMonth() || (ref.getMonth() === d.getMonth() && ref.getDate() < d.getDate())) age--;
  return age;
}

const todayIt = () => new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * One-page player report for parents. Printed with the browser ("Salva come PDF"),
 * so it needs no extra library and stays vector-sharp. Contact details are left out on purpose.
 */
export const PlayerReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPlayer, sessions: all, killerSessions, settings } = useAppData();
  const profile = id ? getPlayer(id) : undefined;

  const sessions = useMemo(
    () => all.filter(s => s.playerId === id && s.completed).sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt)),
    [all, id]
  );
  const results = useMemo(() => sessions.map(s => ({ s, r: computeSessionResults(s, settings) })), [sessions, settings]);
  const latest = results[results.length - 1];
  const first = results.find(x => latest && x.s.category === latest.s.category && x.s.id !== latest.s.id);
  const objective = useMemo(() => playerObjective(sessions, settings), [sessions, settings]);
  const comparison = useMemo(() => (latest ? compareWithGroup(latest.s, all, settings) : null), [latest, all, settings]);
  const killer = useMemo(() => killerSessions.filter(k => k.playerId === id), [killerSessions, id]);

  const defaultNotes = useMemo(() => {
    const parts = [profile?.initialAssessment?.coachNotes, latest?.s.note].map(x => (x ?? '').trim()).filter(Boolean);
    return [...new Set(parts)].join('\n\n');
  }, [profile, latest]);
  const [notes, setNotes] = useState<string | null>(null);
  const [includeNotes, setIncludeNotes] = useState(true);
  const notesText = notes ?? defaultNotes;

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-gray-500">
        <p>Giocatore non trovato.</p>
        <button onClick={() => navigate('/players')} className="text-brand-600 underline text-sm">Torna ai giocatori</button>
      </div>
    );
  }

  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const age = calcAge(profile.dateOfBirth);
  const best = results.reduce<number | null>((m, x) => (m === null || x.r.percentOfIdeal > m ? x.r.percentOfIdeal : m), null);
  const stars = latest ? percentToStars(latest.r.percentOfIdeal) : null;
  const tested = latest ? latest.r.stats.filter(st => st.scores.length > 0) : [];
  const ranked = [...tested].sort((a, b) => b.ave - a.ave);
  const strengths = ranked.slice(0, Math.min(2, ranked.length));
  const toImprove = ranked.length > 2 ? ranked.slice(-2).reverse() : [];

  const radarData = latest
    ? radarStrokes(latest.r.stats, first?.r.stats).map(stroke => {
        const st = latest.r.stats.find(s => s.stroke === stroke)!;
        const f = first?.r.stats.find(s => s.stroke === stroke);
        return { stroke: st.label, value: Number(st.ave.toFixed(2)), first: f ? Number(f.ave.toFixed(2)) : undefined };
      })
    : [];
  const trend = results.map(x => ({ date: x.s.date, pct: Math.round(x.r.percentOfIdeal) }));

  return (
    <div className="min-h-screen bg-neutral-200 print:bg-white">
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .report-sheet { box-shadow: none !important; margin: 0 !important; width: 100% !important; padding: 0 !important; }
        }
        .report-sheet, .report-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
      `}</style>

      {/* Toolbar (not printed) */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/players/${profile.id}`)} className="text-gray-500 text-xl" aria-label="Indietro">←</button>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">Scheda di {name}</p>
            <p className="text-[11px] text-gray-500">Stampa → "Salva come PDF", poi invia su WhatsApp o email</p>
          </div>
          <button onClick={() => window.print()} className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-4 py-2 rounded-xl">
            📄 Crea PDF
          </button>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-3 space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={includeNotes} onChange={e => setIncludeNotes(e.target.checked)} />
            Includi le note del maestro
          </label>
          {includeNotes && (
            <textarea
              value={notesText}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Scrivi qui le note per la famiglia (modificabili, non vengono salvate)"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          )}
        </div>
      </div>

      {/* A4 sheet */}
      <div className="report-sheet mx-auto my-3 sm:my-6 bg-white shadow-xl w-full max-w-[210mm] p-4 sm:p-[10mm] print:p-0 text-gray-900 space-y-4">
        <header className="bg-pitch text-white rounded-2xl px-5 py-4 flex items-center gap-4 break-inside-avoid">
          <BrandLockup size={56} />
          <div className="ml-auto text-right">
            <p className="font-display font-bold text-ball">Scheda giocatore</p>
            <p className="text-sm text-chalk/80">{todayIt()}</p>
          </div>
        </header>

        <section className="flex items-start justify-between gap-4 break-inside-avoid">
          <div>
            <h1 className="text-3xl font-black tracking-tight">{name}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {[age !== null ? `${age} anni` : null, latest ? CATEGORY_TARGETS[latest.s.category].label : null, profile.club, profile.coachName ? `Maestro ${profile.coachName}` : null]
                .filter(Boolean).join(' · ')}
            </p>
          </div>
          {latest && stars !== null && (
            <div className="text-right">
              <p className="text-2xl text-yellow-400 leading-none">{renderStars(stars)}</p>
              <p className="text-xs text-gray-500 mt-1">{STAR_LABELS[stars]}</p>
              <p className="text-3xl font-black mt-1">{latest.r.percentOfIdeal.toFixed(0)}%</p>
              <p className="text-[11px] text-gray-500">ultimo test · {latest.s.date}{best !== null && best > latest.r.percentOfIdeal ? ` · migliore ${best.toFixed(0)}%` : ''}</p>
            </div>
          )}
        </section>

        {!latest ? (
          <p className="text-sm text-gray-500">Nessun test di precisione completato.</p>
        ) : (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 break-inside-avoid">
              <Card title="Profilo tecnico" subtitle={first ? `Ultimo test (verde) e primo test in categoria (grigio)` : 'Media per colpo, su 10'}>
                <Fit printWidth={300}>{w => (
                  <RadarChart width={w} height={w * 0.8} data={radarData} outerRadius={w * 0.28} margin={{ top: 4, right: 30, bottom: 4, left: 30 }}>
                    <PolarGrid stroke="#e5e5e5" />
                    <PolarAngleAxis dataKey="stroke" tick={{ fontSize: 10, fill: '#404040' }} />
                    <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                    {first && <Radar dataKey="first" stroke="#a3a3a3" fill="#a3a3a3" fillOpacity={0.15} strokeDasharray="4 3" isAnimationActive={false} />}
                    <Radar dataKey="value" stroke="#17663e" fill="#17663e" fillOpacity={0.25} strokeWidth={2} isAnimationActive={false} />
                  </RadarChart>
                )}</Fit>
              </Card>
              <Card title="Colpo per colpo" subtitle={`Test del ${latest.s.date}${latest.s.zones && !latest.s.zones.standard ? ' · zone personalizzate' : ''}${sessionPassed(latest.s.series) ? '' : ' · non superato'}`}>
                <StrokeMetricsTable results={latest.r} />
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 print:grid-cols-2 gap-3 mt-3 text-xs">
                  <div className="rounded-xl bg-ok-50 border border-ok-200 p-2.5">
                    <p className="font-bold text-ok-700 mb-1">Punti di forza</p>
                    {strengths.map(s => <p key={s.stroke}>{s.label} · {s.ave.toFixed(1)}</p>)}
                  </div>
                  {toImprove.length > 0 && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5">
                      <p className="font-bold text-amber-800 mb-1">Da migliorare</p>
                      {toImprove.map(s => <p key={s.stroke}>{s.label} · {s.ave.toFixed(1)}</p>)}
                    </div>
                  )}
                </div>
              </Card>
            </section>

            {familiesWithSpecials(latest.r.stats, first?.r.stats).length > 0 && (
              <Card title="Colpi speciali per famiglia" subtitle={first ? 'Ultimo test a colori, primo test in grigio' : 'Media per colpo, su 10'} className="break-inside-avoid">
                <FamilyCharts results={latest.r} compare={first?.r} size={300} />
              </Card>
            )}

            {trend.length >= 2 && (
              <Card title="Andamento nel tempo" subtitle="% ideale test dopo test" className="break-inside-avoid">
                <Fit printWidth={640}>{w => (
                  <LineChart width={w} height={170} data={trend} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickLine={false} />
                    {objective.target > 0 && (
                      <ReferenceLine y={objective.target} stroke="#16a34a" strokeDasharray="4 4"
                        label={{ value: `obiettivo ${objective.target.toFixed(0)}%`, fontSize: 9, fill: '#16a34a', position: 'insideTopRight' }} />
                    )}
                    <Line type="monotone" dataKey="pct" stroke="#17663e" strokeWidth={2} dot={{ r: 3, fill: '#17663e' }} isAnimationActive={false} />
                  </LineChart>
                )}</Fit>
              </Card>
            )}

            <Card title={`Ultimo test · ${latest.s.date}`} subtitle="Serie per serie: palle nel bersaglio su 10, in verde pieno le serie perfette">
              <SeriesBars session={latest.s} />
            </Card>

            <Card title="Zone bersaglio dell'ultimo test" className="break-inside-avoid">
              <ZonesPanel session={latest.s} />
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4">
              <ObjectiveCard objective={objective} print />
              <GroupComparisonCard comparison={comparison} print />
            </div>
          </>
        )}

        <KillerSummaryCard tests={killer} print />

        {includeNotes && notesText.trim() && (
          <Card title="Note del maestro" className="break-inside-avoid">
            <p className="text-sm text-gray-700 whitespace-pre-line">{notesText}</p>
          </Card>
        )}

        <footer className="pt-2 text-[10px] text-gray-400 flex justify-between break-inside-avoid">
          <span>Gladiators Training · Tennis &amp; Padel Academy</span>
          <span>Tennis Precision Test · % ideale su scala {settings.scoreScale === 'radar' ? 'area radar' : 'lineare'}</span>
        </footer>
      </div>
    </div>
  );
};
