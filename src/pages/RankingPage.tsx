import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Category } from '../types';
import { getSessions, getSettings } from '../lib/storage';
import { computeSessionResults } from '../lib/formulas';

type Tab = Category | 'generale';

const TABS: { id: Tab; label: string }[] = [
  { id: 'u10_u12', label: 'U10/U12' },
  { id: 'terza', label: '3ª Cat.' },
  { id: 'seconda', label: '2ª Cat.' },
  { id: 'prima', label: '1ª Cat.' },
  { id: 'generale', label: 'Generale' },
];

const MEDAL = ['🥇', '🥈', '🥉'];

const categoryColor: Record<Category, string> = {
  u10_u12: 'bg-blue-100 text-blue-700',
  terza: 'bg-green-100 text-green-700',
  seconda: 'bg-yellow-100 text-yellow-700',
  prima: 'bg-red-100 text-red-700',
};

const categoryLabel: Record<Category, string> = {
  u10_u12: 'U10/U12',
  terza: '3ª',
  seconda: '2ª',
  prima: '1ª',
};

export const RankingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('generale');

  const sessions = useMemo(() => getSessions(), []);
  const settings = useMemo(() => getSettings(), []);

  // Compute % ideale for every session
  const ranked = useMemo(() =>
    sessions
      .filter(s => s.completed)
      .map(s => ({
        session: s,
        pct: computeSessionResults(s, settings.stdDevMode, settings.precisionTimeStrategy).percentOfIdeal,
      }))
      .sort((a, b) => b.pct - a.pct),
    [sessions, settings]
  );

  // Per-category rankings (all sessions of that category, sorted)
  const byCategory = (cat: Category) =>
    ranked.filter(r => r.session.category === cat);

  // Generale: best session per player per category
  type GeneraleRow = { name: string; u10_u12: number | null; terza: number | null; seconda: number | null; prima: number | null };
  const generalRows = useMemo(() => {
    const map = new Map<string, GeneraleRow>();
    ranked.forEach(({ session, pct }) => {
      const key = session.playerName.trim().toLowerCase();
      const existing: GeneraleRow = map.get(key) ?? { name: session.playerName, u10_u12: null, terza: null, seconda: null, prima: null };
      const cat = session.category;
      if (existing[cat] === null || pct > (existing[cat] as number)) {
        existing[cat] = pct;
      }
      map.set(key, existing);
    });
    // Sort by best score across all categories
    return Array.from(map.values()).sort((a, b) => {
      const bestA = Math.max(a.u10_u12 ?? 0, a.terza ?? 0, a.seconda ?? 0, a.prima ?? 0);
      const bestB = Math.max(b.u10_u12 ?? 0, b.terza ?? 0, b.seconda ?? 0, b.prima ?? 0);
      return bestB - bestA;
    });
  }, [ranked]);

  const renderCategoryRows = (cat: Category) => {
    const rows = byCategory(cat);
    if (rows.length === 0) {
      return (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">🎾</div>
          <p className="text-sm">Nessuna sessione registrata per questa categoria.</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {rows.map(({ session, pct }, i) => (
          <button
            key={session.id}
            onClick={() => navigate(`/results/${session.id}`)}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-green-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              {/* Position */}
              <div className="flex-shrink-0 w-8 text-center">
                {i < 3
                  ? <span className="text-xl">{MEDAL[i]}</span>
                  : <span className="text-sm font-bold text-gray-400">#{i + 1}</span>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 truncate">{session.playerName}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {session.date} · Coach: {session.coach}
                </p>
              </div>

              {/* Score */}
              <div className="flex-shrink-0 text-right">
                <div className={`text-xl font-black ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
                  {pct.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400">% ideale</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderGenerale = () => {
    if (generalRows.length === 0) {
      return (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">🏆</div>
          <p className="text-sm">Nessun dato disponibile. Completa almeno un test!</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Miglior % ideale per giocatore, per ogni categoria testata.
        </p>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 text-gray-600 font-semibold">#</th>
                <th className="text-left px-3 py-2 text-gray-600 font-semibold">Giocatore</th>
                <th className="text-center px-2 py-2 text-gray-600 font-semibold">
                  <span className="inline-block bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">U12</span>
                </th>
                <th className="text-center px-2 py-2 text-gray-600 font-semibold">
                  <span className="inline-block bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">3ª</span>
                </th>
                <th className="text-center px-2 py-2 text-gray-600 font-semibold">
                  <span className="inline-block bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded-full">2ª</span>
                </th>
                <th className="text-center px-2 py-2 text-gray-600 font-semibold">
                  <span className="inline-block bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">1ª</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {generalRows.map((row, i) => {
                const best = Math.max(row.u10_u12 ?? 0, row.terza ?? 0, row.seconda ?? 0, row.prima ?? 0);
                return (
                  <tr key={row.name} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-3">
                      {i < 3
                        ? <span className="text-base">{MEDAL[i]}</span>
                        : <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                      }
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-semibold text-gray-900">{row.name}</span>
                    </td>
                    {(['u10_u12', 'terza', 'seconda', 'prima'] as Category[]).map(cat => (
                      <td key={cat} className="px-2 py-3 text-center">
                        {row[cat] !== null ? (
                          <span className={`font-bold text-sm ${
                            (row[cat] as number) === best && best > 0 ? 'text-green-600' : 'text-gray-700'
                          }`}>
                            {(row[cat] as number).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Per-category podium */}
        <div className="space-y-3">
          {(['u10_u12', 'terza', 'seconda', 'prima'] as Category[]).map(cat => {
            const top = byCategory(cat).slice(0, 3);
            if (top.length === 0) return null;
            return (
              <div key={cat} className="bg-white rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${categoryColor[cat]}`}>
                    {categoryLabel[cat]} Categoria — Podio
                  </span>
                </div>
                <div className="flex gap-2">
                  {top.map(({ session, pct }, i) => (
                    <button
                      key={session.id}
                      onClick={() => navigate(`/results/${session.id}`)}
                      className={`flex-1 rounded-lg p-2 text-center border transition-all hover:shadow-sm
                        ${i === 0 ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <div className="text-lg">{MEDAL[i]}</div>
                      <div className="text-xs font-bold text-gray-800 truncate">{session.playerName}</div>
                      <div className="text-sm font-black text-green-700">{pct.toFixed(1)}%</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 text-xl">←</button>
        <h1 className="text-lg font-bold text-gray-900">Classifiche</h1>
        <span className="ml-auto text-xs text-gray-400">{sessions.filter(s => s.completed).length} sessioni totali</span>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-2 rounded-xl text-sm font-semibold transition-all
                ${activeTab === tab.id
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {activeTab === 'u10_u12' && renderCategoryRows('u10_u12')}
        {activeTab === 'terza' && renderCategoryRows('terza')}
        {activeTab === 'seconda' && renderCategoryRows('seconda')}
        {activeTab === 'prima' && renderCategoryRows('prima')}
        {activeTab === 'generale' && renderGenerale()}
      </div>
    </div>
  );
};
