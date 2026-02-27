import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppData } from '../contexts/AppDataContext';
import { ResultsDashboard } from '../components/results/ResultsDashboard';
import { Button } from '../components/ui/Button';

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <ResultsDashboard session={session} settings={settings} />
      </div>
    </div>
  );
};
