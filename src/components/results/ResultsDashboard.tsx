import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TestSession, AppSettings, SessionResults } from '../../types';
import { computeSessionResults } from '../../lib/formulas';
import { exportSessionCSV, downloadCSV } from '../../lib/export';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatsTable } from './StatsTable';
import { RadarSpider } from '../charts/RadarSpider';
import { SeriesLine } from '../charts/SeriesLine';
import { PrecisionTimeChart } from '../charts/PrecisionTime';
import { ServeChart } from '../charts/ServeChart';

interface Props {
  session: TestSession;
  settings: AppSettings;
  compareSession?: TestSession;
}

export const ResultsDashboard: React.FC<Props> = ({ session, settings, compareSession }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'stats' | 'radar' | 'series' | 'precision' | 'serve'>('stats');

  const results: SessionResults = computeSessionResults(
    session,
    settings.stdDevMode,
    settings.precisionTimeStrategy
  );

  const compareResults = compareSession
    ? computeSessionResults(compareSession, settings.stdDevMode, settings.precisionTimeStrategy)
    : undefined;

  const fhScores = session.series
    .filter(s => s.testType === 'groundstrokes' && s.direction === 'fh_cross')
    .sort((a, b) => a.seriesIndex - b.seriesIndex)
    .map(s => s.score);

  const bhScores = session.series
    .filter(s => s.testType === 'groundstrokes' && s.direction === 'bh_cross')
    .sort((a, b) => a.seriesIndex - b.seriesIndex)
    .map(s => s.score);

  const serveSeries = session.series
    .filter(s => s.testType === 'serve')
    .sort((a, b) => a.seriesIndex - b.seriesIndex);

  const tabs = [
    { id: 'stats', label: 'Stats' },
    { id: 'radar', label: 'Radar' },
    { id: 'series', label: 'FH/BH' },
    { id: 'precision', label: 'Precision' },
    { id: 'serve', label: 'Servizio' },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{session.playerName}</h2>
            <p className="text-sm text-gray-500">
              {session.date} · {session.category} · Coach: {session.coach}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const csv = exportSessionCSV(session);
                downloadCSV(csv, `tpt_${session.playerName}_${session.date}.csv`);
              }}
            >
              Export CSV
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/')}>
              Home
            </Button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-1 gap-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
              ${activeTab === t.id
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'stats' && (
        <Card title="Riepilogo per Stroke" subtitle={`Deviazione: ${settings.stdDevMode === 'sample' ? 'campionaria' : 'di popolazione'}`}>
          <StatsTable
            stats={results.stats}
            radarArea={results.radarArea}
            percentOfIdeal={results.percentOfIdeal}
          />
        </Card>
      )}

      {activeTab === 'radar' && (
        <Card
          title="Radar — 6 Colpi"
          subtitle={`Area: ${results.radarArea.toFixed(1)} · ${results.percentOfIdeal.toFixed(1)}% dell'ideale`}
        >
          <RadarSpider
            values={results.radarValues}
            compareValues={compareResults?.radarValues}
            compareLabel={compareSession ? `${compareSession.playerName} (${compareSession.date})` : undefined}
          />
        </Card>
      )}

      {activeTab === 'series' && (
        <Card title="Andamento Serie — Forehand & Backhand" subtitle="Groundstrokes: 10 serie FH + 10 serie BH">
          <SeriesLine fhScores={fhScores} bhScores={bhScores} />
        </Card>
      )}

      {activeTab === 'precision' && (
        <Card
          title="Precision–Time (10 punti)"
          subtitle={`Strategia: ${settings.precisionTimeStrategy} — media FH/BH/Combined per punto`}
        >
          <PrecisionTimeChart data={results.precisionTime} />
        </Card>
      )}

      {activeTab === 'serve' && (
        <Card title="Servizio — 1ª / 2ª" subtitle="Confronto 1ª e 2ª servizio per serie">
          <ServeChart serveSeries={serveSeries} />
        </Card>
      )}
    </div>
  );
};
