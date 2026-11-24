import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, BarChart, Bar, Cell,
} from 'recharts';
import { useAppData } from '../contexts/AppDataContext';
import { can } from '../lib/auth';
import { CATEGORY_TARGETS } from '../lib/protocol';
import { RESULT_LABEL, matchStats, minutesLabel, stationById } from '../lib/match';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const f1 = (v: number) => v.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const MODE_LABEL = { categoria: 'valore della categoria', storico: 'calcolato sullo storico', manuale: 'scelto dal maestro' } as const;

export const MatchResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { matchSessions, deleteMatch } = useAppData();
  const match = matchSessions.find(m => m.id === id);
  const st = useMemo(() => (match ? matchStats(match) : null), [match]);

  if (!match || !st) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-gray-500">
        <p>Match non trovato.</p>
        <Button onClick={() => navigate('/match')}>Torna ai match</Button>
      </div>
    );
  }

  const { race } = st;
  const won = match.result === 'vinto';
  const lost = match.result === 'perso';

  // Mental reading: did the level hold when the court was close to winning?
  let pressureNote: string | null = null;
  if (st.pressureAvg !== null && st.normalAvg !== null && st.pressureSeries >= 2) {
    const diff = st.pressureAvg - st.normalAvg;
    pressureNote = Math.abs(diff) < 0.5
      ? `Sotto pressione ha tenuto il suo livello (${f1(st.pressureAvg)} contro ${f1(st.normalAvg)} di media).`
      : diff > 0
        ? `Sotto pressione ha alzato il livello: ${f1(st.pressureAvg)} di media contro ${f1(st.normalAvg)}.`
        : `Sotto pressione è calato: ${f1(st.pressureAvg)} di media contro ${f1(st.normalAvg)}.`;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <PageHeader title={`Match di ${match.playerName}`} subtitle={`${match.date} · ${CATEGORY_TARGETS[match.category].label}${match.coach ? ` · ${match.coach}` : ''}`} backTo="/match" />
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Final score */}
        <div className="rounded-2xl bg-pitch text-white px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <p className={`font-display font-extrabold text-4xl ${won ? 'text-ball' : lost ? 'text-red-400' : 'text-chalk'}`}>
              {RESULT_LABEL[match.result]}
            </p>
            {match.expectedWin !== undefined && (
              <p className="text-right text-xs text-chalk/70">
                probabilità alla vigilia<br />
                <span className="text-xl font-display font-bold text-white">{Math.round(match.expectedWin * 100)}%</span>
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl bg-white/5 px-3 py-2.5">
              <p className="text-xs text-chalk/70">Giocatore</p>
              <p className="font-display font-extrabold text-3xl tabular-nums leading-tight">{race.balls}<span className="text-base text-chalk/50"> / {match.playerTarget}</span></p>
            </div>
            <div className="rounded-xl bg-white/5 px-3 py-2.5">
              <p className="text-xs text-chalk/70">Campo</p>
              <p className="font-display font-extrabold text-3xl tabular-nums leading-tight">{race.court}<span className="text-base text-chalk/50"> / {match.courtTarget}</span></p>
            </div>
          </div>
          <p className="text-xs text-chalk/60 mt-3">
            Campo a {match.courtTarget}: {MODE_LABEL[match.targetMode]}. Colpi: {match.stations.map(s => stationById(s).label.toLowerCase()).join(', ')}.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { l: 'Serie giocate', v: `${race.played}`, s: `circa ${minutesLabel(race.played)}` },
            { l: 'Perfette', v: `${race.perfect}`, s: `${race.played ? Math.round((race.perfect / race.played) * 100) : 0}% delle serie` },
            { l: 'Palle dentro', v: `${Math.round(st.insidePct)}%`, s: `media ${f1(st.avgScore)} su 10` },
            { l: 'Perfette di fila', v: `${st.bestPerfectStreak}`, s: 'striscia migliore' },
          ].map(x => (
            <div key={x.l} className="rounded-xl bg-white border border-gray-200 px-3 py-2.5">
              <p className="text-[11px] text-gray-500">{x.l}</p>
              <p className="font-display font-extrabold text-2xl leading-tight">{x.v}</p>
              <p className="text-[11px] text-gray-500">{x.s}</p>
            </div>
          ))}
        </div>

        <Card title="Andamento" subtitle="Quanto manca al traguardo, serie dopo serie. Verde il giocatore, rosso il campo.">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={st.timeline} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeeeee" />
              <XAxis dataKey="n" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fontSize: 10 }} unit="%" />
              <ReferenceLine y={100} stroke="#d4d4d4" />
              <Tooltip formatter={(v: number, k: string) => [`${Math.round(v)}%`, k === 'playerPct' ? 'Giocatore' : 'Campo']}
                labelFormatter={n => `Serie ${n}`} />
              <Line type="stepAfter" dataKey="playerPct" stroke="#17663e" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line type="stepAfter" dataKey="courtPct" stroke="#dc2626" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Serie per serie" subtitle="Verde pieno le perfette. Le altre sono punti per il campo; più scure quelle giocate sotto pressione.">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={st.timeline} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeeeee" vertical={false} />
              <XAxis dataKey="n" tick={{ fontSize: 9 }} interval={0} />
              <YAxis domain={[0, 10]} ticks={[0, 5, 10]} tick={{ fontSize: 9 }} />
              <Bar dataKey="score" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {st.timeline.map(p => (
                  <Cell key={p.n} fill={p.score === 10 ? '#17663e' : p.pressure ? '#b45309' : '#f6c768'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {pressureNote && <p className="text-sm text-gray-700 mt-2">{pressureNote}</p>}
          {st.pressureSeries < 2 && (
            <p className="text-xs text-gray-500 mt-2">Sotto pressione = serie giocate con il campo a 1 o 2 punti dalla vittoria.</p>
          )}
        </Card>

        {st.byStation.length > 1 && (
          <Card title="Per colpo">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-gray-500 text-left">
                  <th className="font-medium pb-1">Colpo</th>
                  <th className="font-medium pb-1 text-right">Serie</th>
                  <th className="font-medium pb-1 text-right">Media</th>
                  <th className="font-medium pb-1 text-right">Perfette</th>
                </tr>
              </thead>
              <tbody>
                {st.byStation.map(b => (
                  <tr key={b.id} className="border-t border-gray-100">
                    <td className="py-1.5">{b.label}</td>
                    <td className="py-1.5 text-right text-gray-600">{b.series}</td>
                    <td className="py-1.5 text-right font-bold">{f1(b.avg)}</td>
                    <td className="py-1.5 text-right text-gray-600">{b.perfect}/{b.series}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {match.note && (
          <Card title="Note"><p className="text-sm text-gray-700 whitespace-pre-line">{match.note}</p></Card>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1 justify-center" onClick={() => navigate(`/players/${match.playerId}`)}>
            Scheda giocatore
          </Button>
          {can('createTest') && (
            <Button className="flex-1 justify-center" onClick={() => navigate('/match/new', { state: { profileId: match.playerId } })}>
              Nuovo match
            </Button>
          )}
        </div>
        {can('createTest') && (
          <button className="w-full text-sm text-red-600 py-2" onClick={async () => {
            if (window.confirm('Eliminare questo match? Non si può annullare.')) {
              await deleteMatch(match.id);
              navigate('/match', { replace: true });
            }
          }}>Elimina match</button>
        )}
      </div>
    </div>
  );
};
