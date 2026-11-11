import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell, CartesianGrid,
} from 'recharts';
import { useAppData } from '../contexts/AppDataContext';
import { can } from '../lib/auth';
import { CATEGORY_TARGETS } from '../lib/protocol';
import {
  computeKillerStats, killerInsights, formatDuration, DEPTH_LABELS, ZONE_LABELS, type KillerStats,
} from '../lib/killer';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const TREND_LABEL = { crescita: '↗ In crescita', calo: '↘ In calo', stabile: '→ Stabile' } as const;

export function killerIndexColor(index: number | null): string {
  if (index === null) return 'text-gray-500';
  if (index >= 70) return 'text-ok-600';
  if (index >= 40) return 'text-yellow-600';
  return 'text-red-500';
}

export const KillerResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { killerSessions, deleteKiller } = useAppData();
  const session = killerSessions.find(k => k.id === id);

  const stats = useMemo(() => (session ? computeKillerStats(session) : null), [session]);

  // Previous completed Killer of the same player with the same target, for comparison
  const previous = useMemo(() => {
    if (!session) return null;
    const prev = killerSessions
      .filter(k => k.playerId === session.playerId && k.id !== session.id && k.target === session.target && k.completed
        && (k.date < session.date || (k.date === session.date && k.createdAt < session.createdAt)))
      .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt))[0];
    return prev ? computeKillerStats(prev) : null;
  }, [session, killerSessions]);

  if (!session || !stats) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Test Killer non trovato.</p>
        <Button onClick={() => navigate('/killer')}>Torna ai test Killer</Button>
      </div>
    );
  }

  const insights = killerInsights(stats);
  const delta = stats.index !== null && previous?.index != null ? stats.index - previous.index : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <PageHeader
        title={session.playerName}
        subtitle={`Killer ${session.target} · ${session.date} · ${CATEGORY_TARGETS[session.category].label}${session.coach ? ` · ${session.coach}` : ''}`}
        backTo="/killer"
        actions={
          <button onClick={() => navigate(`/players/${session.playerId}`)} className="text-xs text-brand-600 font-semibold">
            Scheda →
          </button>
        }
      />
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Headline */}
        <div className="bg-black text-white rounded-2xl p-5 flex items-center gap-5">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-widest text-neutral-400">Indice Killer</p>
            <p className="text-5xl font-black tabular-nums">{stats.index !== null ? Math.round(stats.index) : '—'}</p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-black text-brand-500">{stats.rating}</p>
            <p className="text-sm text-neutral-300 mt-1">
              {stats.completed
                ? stats.errors === 0
                  ? `${session.target} di fila al primo tentativo.`
                  : `${session.target} di fila dopo ${stats.errors} ${stats.errors === 1 ? 'errore' : 'errori'} e ${stats.totalBalls} palle giocate.`
                : `Non completato · miglior serie ${stats.bestStreak} su ${session.target}.`}
            </p>
            {delta !== null && (
              <p className={`text-xs mt-1 font-semibold ${delta >= 0 ? 'text-ok-400' : 'text-red-400'}`}>
                {delta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(delta))} punti rispetto al test precedente
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 px-1">
          L'indice è la percentuale di palle utili sul totale giocato: 100 = nessun errore. Ogni errore costa le palle già fatte in quella serie.
        </p>

        {insights.length > 0 && (
          <Card title="Cosa dicono i numeri">
            <ul className="space-y-2 text-sm text-gray-700">
              {insights.map((t, i) => <li key={i} className="flex gap-2"><span className="text-brand-600">●</span><span>{t}</span></li>)}
            </ul>
          </Card>
        )}

        <MetricsGrid stats={stats} />

        <Card title="Serie per partenza" subtitle="Palle consecutive prima dell'errore (rosso) o fino al traguardo (verde)">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.runList} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="n" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis domain={[0, session.target]} tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip formatter={(v: number) => [`${v} palle`, 'Serie']} labelFormatter={(l: number) => `Partenza ${l}`} />
                <ReferenceLine y={session.target} stroke="#a3a3a3" strokeDasharray="4 4" />
                <Bar dataKey="balls" radius={[4, 4, 0, 0]}>
                  {stats.runList.map(r => (
                    <Cell key={r.n} fill={r.errorStroke === null ? (stats.completed && r.n === stats.runs ? '#16a34a' : '#737373') : '#e10600'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {stats.errors > 0 && (
          <Card title="Dove arrivano gli errori" subtitle="Numero della palla sbagliata, a fasce">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.bands} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} />
                  <Tooltip formatter={(v: number) => [v, 'Errori']} />
                  <Bar dataKey="errors" fill="#e10600" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <Card title="Regole del test">
          <ul className="text-sm text-gray-700 space-y-1">
            <li>{session.target} palle consecutive, alternate dritto / rovescio</li>
            <li>{ZONE_LABELS[session.zone]}</li>
            <li>{DEPTH_LABELS[session.depth]}</li>
          </ul>
          {session.note && <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">📝 {session.note}</p>}
        </Card>

        {can('createTest') && (
          <div className="flex gap-3">
            <Button className="flex-1 justify-center" onClick={() => navigate('/killer/new', { state: { profileId: session.playerId } })}>
              ↻ Nuovo Killer per {session.playerName.split(' ')[0]}
            </Button>
            <Button variant="danger" onClick={async () => {
              if (window.confirm('Eliminare questo test Killer? L\'operazione non si può annullare.')) {
                await deleteKiller(session.id);
                navigate('/killer', { replace: true });
              }
            }}>Elimina</Button>
          </div>
        )}
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="bg-white rounded-xl border border-gray-200 px-3 py-2.5">
    <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
    <p className="text-lg font-black text-gray-900 tabular-nums leading-tight mt-0.5">{value}</p>
    {hint && <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{hint}</p>}
  </div>
);

const MetricsGrid: React.FC<{ stats: KillerStats }> = ({ stats: s }) => {
  const pctOf = (n: number) => (s.errors ? `${Math.round((n / s.errors) * 100)}%` : '—');
  return (
    <div className="space-y-3">
      <section>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 px-1">Consistenza</h3>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Errori" value={s.errors} />
          <Metric label="Partenze" value={s.runs} />
          <Metric label="Palle giocate" value={s.totalBalls} />
          <Metric label="Serie migliore" value={s.bestStreak} />
          <Metric label="Media prima dell'errore" value={s.errors ? s.avgRunBeforeError.toFixed(1) : '—'} />
          <Metric label="Mediana prima dell'errore" value={s.errors ? s.medianRunBeforeError : '—'} />
        </div>
      </section>
      <section>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 px-1">Concentrazione e tenuta</h3>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Errori 1ª metà" value={s.firstHalfErrors} hint={pctOf(s.firstHalfErrors)} />
          <Metric label="Errori 2ª metà" value={s.secondHalfErrors} hint={pctOf(s.secondHalfErrors)} />
          <Metric label="Vicino al traguardo" value={s.pressureErrors} hint="ultimo 10%" />
          <Metric label="Ricadute" value={s.relapses} hint={s.relapses ? `${Math.round(s.relapseRate)}% delle ripartenze` : 'errore subito dopo un errore'} />
          <Metric label="Andamento serie" value={s.trend ? TREND_LABEL[s.trend] : '—'} />
          <Metric label="Errori dritto / rovescio" value={`${s.fhErrors} / ${s.bhErrors}`} hint={s.errors ? `${pctOf(s.fhErrors)} / ${pctOf(s.bhErrors)}` : undefined} />
        </div>
      </section>
      <section>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 px-1">Tempi</h3>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Tempo di gioco" value={formatDuration(s.playMs)} />
          <Metric label="Tempo di raccolta" value={formatDuration(s.pickupMs)} />
          <Metric label="Tempo totale" value={formatDuration(s.totalMs)} />
          <Metric label="Ritmo" value={s.ballsPerMinute ? s.ballsPerMinute.toFixed(0) : '—'} hint="palle al minuto" />
          <Metric label="Raccolta media" value={s.avgPickupMs ? formatDuration(s.avgPickupMs) : '—'} />
          <Metric label="Ultima serie" value={formatDuration(s.finalRunMs)} hint={s.completed ? 'quella completata' : undefined} />
        </div>
      </section>
    </div>
  );
};
