import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppData } from '../contexts/AppDataContext';
import { ResultsDashboard } from '../components/results/ResultsDashboard';
import { Button } from '../components/ui/Button';
import { detectedModules } from '../lib/protocol';

export const SessionResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSession, settings } = useAppData();
  const session = id ? getSession(id) : undefined;

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Sessione non trovata.</p>
        <Button onClick={() => navigate('/')}>Torna alla Home</Button>
      </div>
    );
  }

  const selectedModules = session.selectedModules ?? ['groundstrokes', 'combined', 'return', 'serve', 'volley'] as const;
  const completedModules = detectedModules(session.series);
  const totalModules = selectedModules.length;
  const doneCount = completedModules.filter(m => selectedModules.includes(m as typeof selectedModules[number])).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {!session.completed && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-blue-800">
              Test in corso — {doneCount}/{totalModules} moduli completati
            </p>
            <Button
              size="sm"
              onClick={() => navigate('/new', { state: { resumeSession: session } })}
              className="flex-shrink-0"
            >
              Continua Test
            </Button>
          </div>
        )}
        <ResultsDashboard session={session} settings={settings} />
      </div>
    </div>
  );
};
