import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppData } from '../contexts/AppDataContext';
import { computeSessionResults } from '../lib/formulas';
import { percentToStars, renderStars, STAR_LABELS } from '../lib/stars';
import {
  CATEGORY_TARGETS, MODULE_LABELS, modulePasses, sessionPassed, sessionInterrupted, sessionPartial,
} from '../lib/protocol';
import { Card } from '../components/ui/Card';
import { BrandLockup } from '../components/brand/BrandLockup';
import { SeriesBars, RadarPrint, StrokeBarsPrint, StrokeMetricsTable, ZonesPanel, FamilyCharts, REPORT_PRINT_CSS } from '../components/report/ReportBlocks';
import { familiesWithSpecials, isBaseStroke } from '../lib/formulas';

const dateIt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * Report of ONE test, to hand to the player right after it (print → "Salva come PDF").
 * Contains: outcome per module, % and stars, stroke metrics, series-by-series chart,
 * court with the zones used, radar, coach notes.
 */
export const TestReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSession, getPlayer, sessions, settings } = useAppData();
  const session = id ? getSession(id) : undefined;
  const results = useMemo(() => (session ? computeSessionResults(session, settings) : null), [session, settings]);

  // Previous completed test of the same player and category, for the radar comparison
  const previous = useMemo(() => {
    if (!session) return null;
    const prev = sessions
      .filter(s => s.playerId === session.playerId && s.id !== session.id && s.completed && s.category === session.category
        && (s.date + s.createdAt) < (session.date + session.createdAt))
      .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt))[0];
    return prev ? { s: prev, r: computeSessionResults(prev, settings) } : null;
  }, [session, sessions, settings]);

  const [notes, setNotes] = useState<string | null>(null);
  const [includeNotes, setIncludeNotes] = useState(true);

  if (!session || !results) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-gray-500">
        <p>Test non trovato.</p>
        <button onClick={() => navigate('/')} className="text-brand-700 underline text-sm">Torna alla home</button>
      </div>
    );
  }

  const profile = getPlayer(session.playerId);
  const notesText = notes ?? (session.note ?? '');
  const stars = percentToStars(results.percentOfIdeal);
  const passes = modulePasses(session.series);
  const passed = sessionPassed(session.series);
  const interrupted = sessionInterrupted(session.series);
  const partial = sessionPartial(session.series);
  const notDone = (session.plannedModules ?? []).filter(m => !passes.some(p => p.module === m));
  const totalBalls = session.series.length * 10;
  const inside = session.series.reduce((a, s) => a + s.score, 0);
  const perfect = session.series.filter(s => s.score === 10).length;
  const baseTested = results.stats.filter(st => isBaseStroke(st.stroke) && st.scores.length > 0).length;

  return (
    <div className="min-h-screen bg-neutral-200 print:bg-white">
      <style>{REPORT_PRINT_CSS}</style>

      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/results/${session.id}`)} className="text-gray-500 text-xl" aria-label="Indietro">←</button>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">Test di {session.playerName} · {session.date}</p>
            <p className="text-[11px] text-gray-500">Stampa → "Salva come PDF", poi invia su WhatsApp o email</p>
          </div>
          <button onClick={() => window.print()} className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-4 py-2 rounded-xl">
            Crea PDF
          </button>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-3 space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={includeNotes} onChange={e => setIncludeNotes(e.target.checked)} />
            Includi le note del maestro
          </label>
          {includeNotes && (
            <textarea value={notesText} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Note per il giocatore o la famiglia (non vengono salvate)"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          )}
        </div>
      </div>

      <div className="report-sheet mx-auto my-3 sm:my-6 bg-white shadow-xl w-full max-w-[210mm] p-4 sm:p-[10mm] print:p-0 text-ink space-y-4">
        <header className="bg-pitch text-white rounded-2xl px-5 py-4 flex items-center gap-4 break-inside-avoid">
          <BrandLockup size={56} />
          <div className="ml-auto text-right">
            <p className="font-display font-bold text-ball">Risultato del test</p>
            <p className="text-sm text-chalk/80">{dateIt(session.date)}</p>
          </div>
        </header>

        <section className="flex items-start justify-between gap-4 break-inside-avoid">
          <div className="min-w-0">
            <h1 className="text-3xl font-display font-extrabold leading-tight">{session.playerName}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {[CATEGORY_TARGETS[session.category].label, profile?.club, session.coach ? `Maestro ${session.coach}` : null].filter(Boolean).join(' · ')}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${passed ? 'bg-ok-100 text-ok-800' : interrupted ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-800'}`}>
                {passed ? 'Test superato' : interrupted ? 'Test interrotto' : 'Test non superato'}
              </span>
              {partial && (
                <span className="text-xs font-semibold rounded-full px-2.5 py-0.5 bg-gray-100 text-gray-700">
                  Parziale: {passes.map(p => MODULE_LABELS[p.module]).join(', ')}
                </span>
              )}
            </div>
            {notDone.length > 0 && (
              <p className="text-xs text-gray-500 mt-1.5">Non svolti in questa sessione: {notDone.map(m => MODULE_LABELS[m]).join(', ')}.</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl text-yellow-400 leading-none">{renderStars(stars)}</p>
            <p className="text-xs text-gray-500 mt-1">{STAR_LABELS[stars]}</p>
            <p className="text-4xl font-display font-extrabold mt-1 leading-none">{results.percentOfIdeal.toFixed(0)}%</p>
            <p className="text-[11px] text-gray-500 mt-1">% ideale{partial ? ' sui colpi testati' : ''}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 min-[400px]:grid-cols-3 print:grid-cols-3 gap-2 break-inside-avoid">
          {[
            { label: 'Serie giocate', value: session.series.length },
            { label: 'Serie perfette (10/10)', value: perfect },
            { label: 'Palle nel bersaglio', value: `${inside}/${totalBalls} · ${totalBalls ? Math.round((inside / totalBalls) * 100) : 0}%` },
          ].map(m => (
            <div key={m.label} className="rounded-xl bg-chalk/60 px-3 py-2.5">
              <p className="text-[11px] text-gray-600">{m.label}</p>
              <p className="font-display font-extrabold text-xl leading-tight">{m.value}</p>
            </div>
          ))}
        </section>

        <Card title="Serie per serie" subtitle="Palle nel bersaglio su 10 in ogni serie. In verde pieno le serie perfette.">
          <SeriesBars session={session} />
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4">
          {baseTested > 0 ? (
            <Card title="Profilo tecnico" subtitle={previous ? `Questo test (verde) e il precedente del ${previous.s.date} (grigio)` : 'I 6 colpi base, media su 10'} className="break-inside-avoid">
              <div className="flex justify-center"><RadarPrint results={results} compare={previous?.r} size={300} /></div>
              {baseTested < 3 && <StrokeBarsPrint results={results} />}
            </Card>
          ) : (
            <Card title="Colpi speciali" subtitle="Media per colpo, su 10" className="break-inside-avoid">
              <FamilyCharts results={results} compare={previous?.r} size={300} />
            </Card>
          )}
          <Card title="Metriche per colpo" className="break-inside-avoid">
            <StrokeMetricsTable results={results} />
            <p className="text-[11px] text-gray-500 mt-2">Costanza: scarto medio tra le serie (più è basso, più è regolare).</p>
          </Card>
        </div>

        {baseTested > 0 && familiesWithSpecials(results.stats).length > 0 && (
          <Card title="Colpi speciali per famiglia" subtitle={previous ? 'Questo test a colori, il precedente in grigio' : 'Media per colpo, su 10'} className="break-inside-avoid">
            <FamilyCharts results={results} compare={previous?.r} size={300} />
          </Card>
        )}

        <Card title="Zone bersaglio" className="break-inside-avoid">
          <ZonesPanel session={session} />
        </Card>

        {includeNotes && notesText.trim() && (
          <Card title="Note del maestro" className="break-inside-avoid">
            <p className="text-sm text-gray-700 whitespace-pre-line">{notesText}</p>
          </Card>
        )}

        <footer className="pt-2 text-[10px] text-gray-400 flex justify-between break-inside-avoid">
          <span>Gladiators Training · Tennis &amp; Padel Academy</span>
          <span>% ideale su scala {settings.scoreScale === 'radar' ? 'area radar' : 'lineare'}</span>
        </footer>
      </div>
    </div>
  );
};
