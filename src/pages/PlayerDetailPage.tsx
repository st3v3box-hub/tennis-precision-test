import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { getPlayerProfile, getSessions, getSettings } from '../lib/storage';
import { computeSessionResults } from '../lib/formulas';
import { percentToStars, renderStars, STAR_LABELS } from '../lib/stars';
import { StarPicker } from '../components/ui/StarPicker';
import { Card } from '../components/ui/Card';
import type { InitialAssessment } from '../types';

function calcAge(dob: string, ref = new Date()): number {
  const d = new Date(dob);
  let age = ref.getFullYear() - d.getFullYear();
  if (
    ref.getMonth() < d.getMonth() ||
    (ref.getMonth() === d.getMonth() && ref.getDate() < d.getDate())
  ) age--;
  return age;
}

const ASSESSMENT_FIELDS: { key: keyof InitialAssessment; label: string }[] = [
  { key: 'serve', label: 'Servizio' },
  { key: 'forehand', label: 'Forehand' },
  { key: 'backhand', label: 'Backhand' },
  { key: 'volley', label: 'Volley' },
  { key: 'return', label: 'Return' },
  { key: 'combined', label: 'Combined' },
  { key: 'movement', label: 'Mobilità' },
];

const CATEGORY_LABEL: Record<string, string> = {
  u10_u12: 'U10/U12',
  terza: '3ª Cat.',
  seconda: '2ª Cat.',
  prima: '1ª Cat.',
};

export const PlayerDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const profile = id ? getPlayerProfile(id) : undefined;

  const settings = useMemo(() => getSettings(), []);
  const allSessions = useMemo(() => getSessions(), []);

  const sessions = useMemo(
    () =>
      allSessions
        .filter(s => s.playerId === id && s.completed)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [allSessions, id]
  );

  const sessionResults = useMemo(
    () =>
      sessions.map(s => ({
        session: s,
        result: computeSessionResults(s, settings.stdDevMode, settings.precisionTimeStrategy),
      })),
    [sessions, settings]
  );

  const chartData = useMemo(
    () =>
      sessionResults.map(({ session, result }) => ({
        date: session.date,
        pct: Math.round(result.percentOfIdeal),
        cat: CATEGORY_LABEL[session.category] ?? session.category,
      })),
    [sessionResults]
  );

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-2">👤</div>
          <p>Giocatore non trovato</p>
          <button onClick={() => navigate('/players')} className="text-green-600 text-sm mt-2 underline">
            Torna all'anagrafica
          </button>
        </div>
      </div>
    );
  }

  const age = calcAge(profile.dateOfBirth);
  const bestResult = sessionResults.length > 0
    ? sessionResults.reduce((best, cur) =>
        cur.result.percentOfIdeal > best.result.percentOfIdeal ? cur : best
      )
    : null;
  const stars = bestResult ? percentToStars(bestResult.result.percentOfIdeal) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm flex items-center gap-3">
        <button onClick={() => navigate('/players')} className="text-gray-500 hover:text-gray-700 text-xl">←</button>
        <h1 className="text-lg font-bold text-gray-900 flex-1 truncate">
          {profile.lastName} {profile.firstName}
        </h1>
        <button
          onClick={() => navigate(`/players/${profile.id}/edit`)}
          className="text-xs text-gray-500 hover:text-green-600 font-medium px-3 py-1.5 border border-gray-200 rounded-lg"
        >
          Modifica
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Profile summary card */}
        <Card title="Profilo">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-gray-900">
                {profile.lastName} {profile.firstName}
              </h2>
              <p className="text-sm text-gray-500">
                {age} anni · {profile.dateOfBirth}
              </p>
              {profile.club && (
                <p className="text-sm text-gray-600">🏟 {profile.club}</p>
              )}
              {profile.fitRanking && (
                <p className="text-sm text-blue-600 font-medium">FIT: {profile.fitRanking}</p>
              )}
              {profile.coachName && (
                <p className="text-sm text-gray-500">Coach: {profile.coachName}</p>
              )}
              {profile.phone && (
                <p className="text-sm text-gray-500">📞 {profile.phone}</p>
              )}
              {profile.email && (
                <p className="text-sm text-gray-500">✉️ {profile.email}</p>
              )}
              {profile.parentName && (
                <p className="text-sm text-gray-500">👨‍👩‍👦 {profile.parentName}</p>
              )}
            </div>
            {stars !== null && (
              <div className="text-right flex-shrink-0">
                <div className="text-2xl text-yellow-400">{renderStars(stars)}</div>
                <div className="text-xs text-gray-500 mt-0.5">{STAR_LABELS[stars]}</div>
                <div className="text-xs text-gray-400">
                  {bestResult!.result.percentOfIdeal.toFixed(0)}% best
                </div>
                <div className="text-xs text-gray-400">{sessions.length} test</div>
              </div>
            )}
          </div>
          {profile.notes && (
            <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
              {profile.notes}
            </p>
          )}
        </Card>

        {/* Initial assessment */}
        {profile.initialAssessment && Object.keys(profile.initialAssessment).some(
          k => k !== 'coachNotes' && k !== 'assessmentDate' && profile.initialAssessment![k as keyof InitialAssessment] !== undefined
        ) && (
          <Card title="Valutazione Iniziale">
            {profile.initialAssessment.assessmentDate && (
              <p className="text-xs text-gray-400 mb-3">Data: {profile.initialAssessment.assessmentDate}</p>
            )}
            <div className="space-y-2">
              {ASSESSMENT_FIELDS.map(({ key, label }) => {
                const val = profile.initialAssessment![key] as number | undefined;
                if (val === undefined) return null;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 w-28">{label}</span>
                    <StarPicker value={val} onChange={() => {}} readOnly />
                  </div>
                );
              })}
            </div>
            {profile.initialAssessment.coachNotes && (
              <p className="mt-3 text-sm text-gray-600 bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
                {profile.initialAssessment.coachNotes}
              </p>
            )}
          </Card>
        )}

        {/* Trend chart */}
        {chartData.length >= 2 && (
          <Card title="Andamento % Ideale">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, '% Ideale']}
                  labelFormatter={(label: string) => `Data: ${label}`}
                />
                <ReferenceLine y={50} stroke="#d1fae5" strokeDasharray="4 4" />
                <ReferenceLine y={80} stroke="#6ee7b7" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="pct"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ fill: '#16a34a', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Quick-start test section */}
        <Card title="Avvia Test Rapido">
          <p className="text-xs text-gray-500 mb-3">
            Seleziona la categoria per iniziare subito il test — i dati di {profile.firstName} sono già configurati.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {(['u10_u12', 'terza', 'seconda', 'prima'] as const).map(cat => {
              const labels: Record<string, string> = {
                u10_u12: 'U10/U12', terza: '3ª Cat.', seconda: '2ª Cat.', prima: '1ª Cat.',
              };
              return (
                <button
                  key={cat}
                  onClick={() => navigate('/new', {
                    state: {
                      quickStart: {
                        profileId: profile.id,
                        name: `${profile.firstName} ${profile.lastName}`.trim(),
                        dateOfBirth: profile.dateOfBirth,
                        category: cat,
                      },
                    },
                  })}
                  className="py-2.5 rounded-xl border-2 border-green-300 bg-green-50 text-xs font-bold text-green-700 hover:bg-green-100 hover:border-green-500 transition-all"
                >
                  {labels[cat]}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Sessions */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">
            Sessioni ({sessions.length})
          </h2>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm">Nessun test ancora per questo giocatore.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...sessionResults].reverse().map(({ session, result }) => {
              const s = percentToStars(result.percentOfIdeal);
              return (
                <button
                  key={session.id}
                  onClick={() => navigate(`/results/${session.id}`)}
                  className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-green-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-800 text-sm">{session.date}</span>
                      <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {CATEGORY_LABEL[session.category] ?? session.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-yellow-400">{renderStars(s)}</div>
                      <div className="text-xs text-gray-500">{result.percentOfIdeal.toFixed(1)}%</div>
                    </div>
                  </div>
                  {session.note && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{session.note}</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
