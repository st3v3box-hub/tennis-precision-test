import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppData } from '../contexts/AppDataContext';
import { ResultsDashboard } from '../components/results/ResultsDashboard';
import { Button } from '../components/ui/Button';

export const MultiResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const ids: string[] = (location.state as { ids: string[] } | null)?.ids ?? [];
  const { getSession, settings } = useAppData();

  const sessions = ids.map(id => getSession(id)).filter(Boolean) as NonNullable<ReturnType<typeof getSession>>[];

  const [activeIdx, setActiveIdx] = useState(0);

  if (sessions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Nessuna sessione trovata.</p>
        <Button onClick={() => navigate('/')}>Torna alla Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Player tab bar */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 mb-4">
          <p className="text-xs text-gray-500 font-medium mb-2">
            {sessions.length} giocatori — seleziona per vedere i risultati
          </p>
          <div className="flex gap-1.5 overflow-x-auto">
            {sessions.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveIdx(i)}
                className={`flex-1 py-2 px-3 rounded-xl border-2 text-sm font-semibold transition-all whitespace-nowrap
                  ${activeIdx === i
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                  }`}
              >
                {s.playerName}
              </button>
            ))}
          </div>
        </div>

        <ResultsDashboard session={sessions[activeIdx]} settings={settings} />
      </div>
    </div>
  );
};
