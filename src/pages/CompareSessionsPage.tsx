import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSession, getSettings } from '../lib/storage';
import { ResultsDashboard } from '../components/results/ResultsDashboard';
import { Button } from '../components/ui/Button';

export const CompareSessionsPage: React.FC = () => {
  const { id1, id2 } = useParams<{ id1: string; id2: string }>();
  const navigate = useNavigate();
  const session1 = id1 ? getSession(id1) : undefined;
  const session2 = id2 ? getSession(id2) : undefined;
  const settings = getSettings();

  if (!session1 || !session2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Una o entrambe le sessioni non trovate.</p>
        <Button onClick={() => navigate('/')}>Torna alla Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">←</button>
          <h1 className="text-base font-bold">Confronto Sessioni</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-sm text-blue-700">
          <strong>{session1.playerName}</strong> ({session1.date}) vs{' '}
          <strong>{session2.playerName}</strong> ({session2.date}) — il Radar mostra entrambe le sessioni
        </div>
        <ResultsDashboard
          session={session1}
          settings={settings}
          compareSession={session2}
        />
      </div>
    </div>
  );
};
