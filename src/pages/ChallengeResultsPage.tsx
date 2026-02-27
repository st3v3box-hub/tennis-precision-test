import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { useAppData } from '../contexts/AppDataContext';
import { computeSessionResults } from '../lib/formulas';
import { percentToStars, renderStars } from '../lib/stars';
import { Button } from '../components/ui/Button';
import type { TestSession } from '../types';

type ChallengeMode = '1v1' | '2v2' | 'ffa';

interface StrokeRow {
  label: string;
  val1: number;
  val2: number;
  winner: 0 | 1 | 2;
}

interface PlayerStat {
  idx: number;
  name: string;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  pct: number;
}

interface MatchupResult {
  a: number;
  b: number;
  strokesA: number;
  strokesB: number;
  winner: 0 | 1 | 2;
  rows: StrokeRow[];
}

const RADAR_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f97316'];
const RADAR_LABELS = ['A', 'B', 'C', 'D'];

export const ChallengeResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { ids, mode } = ((location.state ?? {}) as { ids?: string[]; mode?: ChallengeMode });

  const { sessions: allSessions, settings } = useAppData();

  const sessions: TestSession[] = useMemo(
    () => (ids ?? []).map(id => allSessions.find(s => s.id === id)).filter(Boolean) as TestSession[],
    [ids, allSessions]
  );

  const results = useMemo(
    () => sessions.map(s => computeSessionResults(s, settings.stdDevMode, settings.precisionTimeStrategy)),
    [sessions, settings]
  );

  if (!ids || sessions.length < 2) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-2">🏆</div>
          <p>Sfida non trovata.</p>
          <button onClick={() => navigate('/')} className="text-green-600 text-sm mt-2 underline">
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  // ── FFA mode ─────────────────────────────────────────────────────────────────

  if (mode === 'ffa') {
    const n = sessions.length;

    const matchups: MatchupResult[] = [];
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const rA = results[a];
        const rB = results[b];
        const rows: StrokeRow[] = rA.stats.map((s, i) => ({
          label: s.label,
          val1: s.ave,
          val2: rB.stats[i].ave,
          winner: s.ave > rB.stats[i].ave ? 1 : rB.stats[i].ave > s.ave ? 2 : 0,
        }));
        const strokesA = rows.filter(r => r.winner === 1).length;
        const strokesB = rows.filter(r => r.winner === 2).length;
        matchups.push({
          a, b, strokesA, strokesB,
          winner: strokesA > strokesB ? 1 : strokesB > strokesA ? 2 : 0,
          rows,
        });
      }
    }

    const playerStats: PlayerStat[] = sessions.map((s, i) => ({
      idx: i,
      name: s.playerName,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      pct: results[i].percentOfIdeal,
    }));

    matchups.forEach(mr => {
      if (mr.winner === 1) {
        playerStats[mr.a].wins++;
        playerStats[mr.a].points += 2;
        playerStats[mr.b].losses++;
      } else if (mr.winner === 2) {
        playerStats[mr.b].wins++;
        playerStats[mr.b].points += 2;
        playerStats[mr.a].losses++;
      } else {
        playerStats[mr.a].draws++;
        playerStats[mr.a].points++;
        playerStats[mr.b].draws++;
        playerStats[mr.b].points++;
      }
    });

    const ranked = [...playerStats].sort((a, b) =>
      b.points !== a.points ? b.points - a.points : b.pct - a.pct
    );

    const radarData = results[0].stats.map((s, si) => {
      const entry: Record<string, string | number> = { subject: s.label };
      results.forEach((r, ri) => {
        entry[RADAR_LABELS[ri]] = parseFloat(r.stats[si].ave.toFixed(2));
      });
      return entry;
    });

    const medalFor = (rank: number) => ['🥇', '🥈', '🥉'][rank] ?? `${rank + 1}°`;

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 text-xl">←</button>
          <h1 className="text-lg font-bold text-gray-900">🔄 Tutti vs Tutti ({n} giocatori)</h1>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Classifica Finale</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-3 py-2 text-gray-500 font-semibold w-8">#</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-semibold">Giocatore</th>
                  <th className="text-center px-2 py-2 text-gray-500 font-semibold">V</th>
                  <th className="text-center px-2 py-2 text-gray-500 font-semibold">P</th>
                  <th className="text-center px-2 py-2 text-gray-500 font-semibold">S</th>
                  <th className="text-center px-2 py-2 text-gray-500 font-semibold">Pts</th>
                  <th className="text-center px-3 py-2 text-gray-500 font-semibold">% Ideale</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((ps, rank) => (
                  <tr key={ps.idx} className={`border-b border-gray-50 last:border-0 ${rank === 0 ? 'bg-yellow-50' : ''}`}>
                    <td className="px-3 py-3 text-lg">{medalFor(rank)}</td>
                    <td className="px-3 py-3 font-bold text-gray-900">{ps.name}</td>
                    <td className="px-2 py-3 text-center text-green-600 font-semibold">{ps.wins}</td>
                    <td className="px-2 py-3 text-center text-gray-400">{ps.draws}</td>
                    <td className="px-2 py-3 text-center text-red-400">{ps.losses}</td>
                    <td className="px-2 py-3 text-center font-black text-gray-900">{ps.points}</td>
                    <td className="px-3 py-3 text-center font-semibold text-green-700">{ps.pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400">V = Vittorie (2 pts) · P = Pareggi (1 pt) · S = Sconfitte</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Sfide Dirette</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {matchups.map((mr, mi) => {
                const nameA = sessions[mr.a].playerName.split(' ')[0];
                const nameB = sessions[mr.b].playerName.split(' ')[0];
                const colorA = RADAR_COLORS[mr.a];
                const colorB = RADAR_COLORS[mr.b];
                return (
                  <div key={mi} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold" style={{ color: colorA }}>{nameA}</span>
                      <span className={`text-2xl font-black ${mr.winner === 0 ? 'text-gray-500' : 'text-gray-900'}`}>
                        {mr.strokesA}–{mr.strokesB}
                      </span>
                      <span className="text-sm font-bold" style={{ color: colorB }}>{nameB}</span>
                      <span className="ml-auto text-xs text-gray-400">colpi vinti</span>
                      {mr.winner === 1 && <span className="text-xs font-bold text-green-600">↑ {nameA}</span>}
                      {mr.winner === 2 && <span className="text-xs font-bold text-green-600">↑ {nameB}</span>}
                      {mr.winner === 0 && <span className="text-xs text-gray-400">Pareggio</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Radar Comparativo</h2>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                {results.map((_, ri) => (
                  <Radar
                    key={ri}
                    name={sessions[ri].playerName.split(' ')[0]}
                    dataKey={RADAR_LABELS[ri]}
                    stroke={RADAR_COLORS[ri]}
                    fill={RADAR_COLORS[ri]}
                    fillOpacity={0.15}
                  />
                ))}
                <Tooltip formatter={(v: number) => v.toFixed(2)} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Dettaglio individuale</h2>
            {ids.map((id, i) => (
              <button
                key={id}
                onClick={() => navigate(`/results/${id}`)}
                className="w-full bg-white rounded-xl border border-gray-200 px-4 py-3 text-left hover:border-green-300 hover:shadow-sm transition-all flex items-center justify-between"
              >
                <span className="text-sm font-medium text-gray-700">
                  <span style={{ color: RADAR_COLORS[i] }}>●</span> {sessions[i]?.playerName ?? `Giocatore ${i + 1}`}
                </span>
                <span className="text-xs text-green-600 font-medium">Vedi risultati →</span>
              </button>
            ))}
          </div>

          <Button className="w-full justify-center" onClick={() => navigate('/')}>
            Torna alla Home
          </Button>
        </div>
      </div>
    );
  }

  // ── 1v1 / 2v2 mode ───────────────────────────────────────────────────────────

  let name1: string;
  let name2: string;
  let pct1: number;
  let pct2: number;
  let comparison: StrokeRow[];
  let radarData: { subject: string; A: number; B: number }[];

  if (mode === '1v1') {
    const r1 = results[0];
    const r2 = results[1];
    name1 = sessions[0].playerName;
    name2 = sessions[1].playerName;
    pct1 = r1.percentOfIdeal;
    pct2 = r2.percentOfIdeal;
    comparison = r1.stats.map((s, i) => {
      const v2 = r2.stats[i].ave;
      return { label: s.label, val1: s.ave, val2: v2, winner: s.ave > v2 ? 1 : v2 > s.ave ? 2 : 0 };
    });
    radarData = r1.stats.map((s, i) => ({
      subject: s.label,
      A: parseFloat(s.ave.toFixed(2)),
      B: parseFloat(r2.stats[i].ave.toFixed(2)),
    }));
  } else {
    const rA1 = results[0];
    const rA2 = results[1] ?? results[0];
    const rB1 = results[2] ?? results[0];
    const rB2 = results[3] ?? results[2] ?? results[0];
    name1 = `${sessions[0].playerName} & ${sessions[1]?.playerName ?? ''}`;
    name2 = `${sessions[2]?.playerName ?? ''} & ${sessions[3]?.playerName ?? ''}`;
    pct1 = (rA1.percentOfIdeal + rA2.percentOfIdeal) / 2;
    pct2 = (rB1.percentOfIdeal + rB2.percentOfIdeal) / 2;
    comparison = rA1.stats.map((s, i) => {
      const v1 = (s.ave + rA2.stats[i].ave) / 2;
      const v2 = (rB1.stats[i].ave + rB2.stats[i].ave) / 2;
      return { label: s.label, val1: v1, val2: v2, winner: v1 > v2 ? 1 : v2 > v1 ? 2 : 0 };
    });
    radarData = rA1.stats.map((s, i) => ({
      subject: s.label,
      A: parseFloat(((s.ave + rA2.stats[i].ave) / 2).toFixed(2)),
      B: parseFloat(((rB1.stats[i].ave + rB2.stats[i].ave) / 2).toFixed(2)),
    }));
  }

  const score1 = comparison.filter(c => c.winner === 1).length;
  const score2 = comparison.filter(c => c.winner === 2).length;
  const overallWinner = score1 > score2 ? 1 : score2 > score1 ? 2 : 0;
  const stars1 = percentToStars(pct1);
  const stars2 = percentToStars(pct2);
  const shortName = (full: string) => full.split(' ')[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 text-xl">←</button>
        <h1 className="text-lg font-bold text-gray-900">
          🏆 Sfida {mode === '1v1' ? '1 vs 1' : '2 vs 2'}
        </h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          {overallWinner !== 0 && (
            <div className="text-center mb-4">
              <span className={`text-sm font-black ${overallWinner === 1 ? 'text-red-600' : 'text-blue-600'}`}>
                🏆 VINCE {overallWinner === 1 ? name1.split('&')[0].trim().toUpperCase() : name2.split('&')[0].trim().toUpperCase()}
                {mode === '2v2' ? ' e team' : ''}
              </span>
            </div>
          )}
          {overallWinner === 0 && (
            <div className="text-center mb-4">
              <span className="text-sm font-black text-gray-500">🤝 PAREGGIO</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className={`flex-1 text-center rounded-xl p-3 ${overallWinner === 1 ? 'bg-red-50 border-2 border-red-300' : overallWinner === 2 ? 'opacity-60' : ''}`}>
              <div className="text-xs font-bold text-red-500 mb-1">🔴 {mode === '2v2' ? 'TEAM 1' : ''}</div>
              <div className="text-sm font-black text-gray-900 leading-tight">{name1}</div>
              <div className="text-2xl font-black text-green-700 mt-1">{pct1.toFixed(1)}%</div>
              <div className="text-yellow-400 text-sm mt-0.5">{renderStars(stars1)}</div>
            </div>

            <div className="text-center px-2 flex-shrink-0">
              <div className="text-4xl font-black text-gray-900">{score1}–{score2}</div>
              <div className="text-xs text-gray-400 mt-0.5">colpi vinti</div>
            </div>

            <div className={`flex-1 text-center rounded-xl p-3 ${overallWinner === 2 ? 'bg-blue-50 border-2 border-blue-300' : overallWinner === 1 ? 'opacity-60' : ''}`}>
              <div className="text-xs font-bold text-blue-500 mb-1">🔵 {mode === '2v2' ? 'TEAM 2' : ''}</div>
              <div className="text-sm font-black text-gray-900 leading-tight">{name2}</div>
              <div className="text-2xl font-black text-green-700 mt-1">{pct2.toFixed(1)}%</div>
              <div className="text-yellow-400 text-sm mt-0.5">{renderStars(stars2)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Confronto Colpi</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-3 py-2 text-gray-500 font-semibold">Colpo</th>
                <th className="text-center px-3 py-2 text-red-600 font-bold">🔴 {shortName(name1)}</th>
                <th className="text-center px-3 py-2 text-blue-600 font-bold">🔵 {shortName(name2)}</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="px-3 py-3 font-medium text-gray-700">{row.label}</td>
                  <td className={`px-3 py-3 text-center font-bold ${row.winner === 1 ? 'text-red-600 bg-red-50' : 'text-gray-400'}`}>
                    {row.val1.toFixed(1)}{row.winner === 1 && ' ▲'}
                  </td>
                  <td className={`px-3 py-3 text-center font-bold ${row.winner === 2 ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
                    {row.val2.toFixed(1)}{row.winner === 2 && ' ▲'}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className="px-3 py-3 font-bold text-gray-700">% Ideale</td>
                <td className={`px-3 py-3 text-center font-black ${overallWinner === 1 ? 'text-red-600' : 'text-gray-600'}`}>
                  {pct1.toFixed(1)}%
                </td>
                <td className={`px-3 py-3 text-center font-black ${overallWinner === 2 ? 'text-blue-600' : 'text-gray-600'}`}>
                  {pct2.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Radar Comparativo</h2>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
              <Radar name={shortName(name1)} dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
              <Radar name={shortName(name2)} dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              <Tooltip formatter={(v: number) => v.toFixed(2)} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Dettaglio individuale</h2>
          {ids.map((id, i) => (
            <button
              key={id}
              onClick={() => navigate(`/results/${id}`)}
              className="w-full bg-white rounded-xl border border-gray-200 px-4 py-3 text-left hover:border-green-300 hover:shadow-sm transition-all flex items-center justify-between"
            >
              <span className="text-sm font-medium text-gray-700">
                {i < 2 ? '🔴' : '🔵'} {sessions[i]?.playerName ?? `Giocatore ${i + 1}`}
              </span>
              <span className="text-xs text-green-600 font-medium">Vedi risultati →</span>
            </button>
          ))}
        </div>

        <Button className="w-full justify-center" onClick={() => navigate('/')}>
          Torna alla Home
        </Button>
      </div>
    </div>
  );
};
