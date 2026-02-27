import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { HistoryList } from '../components/history/HistoryList';
import { getSettings, getSessions } from '../lib/storage';
import { logout, getCredentials } from '../lib/auth';
import type { TestSession, AppSettings } from '../types';

interface Props {
  onLogout: () => void;
}

export const HomePage: React.FC<Props> = ({ onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onLogout();
  };
  const [sessions, setSessions] = useState<TestSession[]>(getSessions);
  const [settings] = useState<AppSettings>(getSettings);
  const [view, setView] = useState<'home' | 'history'>('home');

  const refresh = () => setSessions(getSessions());

  if (view === 'history') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 shadow-sm flex items-center gap-3">
          <button onClick={() => setView('home')} className="text-gray-500 hover:text-gray-700 text-xl">←</button>
          <h1 className="text-lg font-bold text-gray-900">Storico Sessioni</h1>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <HistoryList sessions={sessions} settings={settings} onRefresh={refresh} />
        </div>
      </div>
    );
  }

  const recentSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-green-700 to-green-900 text-white px-6 pt-10 pb-8">
        <div className="max-w-2xl mx-auto flex items-center gap-5">
          <img src="./logo.png" alt="GT Logo" className="h-20 w-auto drop-shadow-lg" />
          <div className="flex-1">
            <h1 className="text-2xl font-black tracking-tight">Tennis Precision Test</h1>
            <p className="text-green-200 text-sm mt-1">Profilo tecnico · Analisi precisione</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex-shrink-0 text-green-200 hover:text-white text-xs font-medium flex flex-col items-center gap-0.5 transition-colors"
            title="Esci"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>{getCredentials()?.username ?? ''}</span>
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Actions */}
        <Button
          size="lg"
          className="w-full text-base justify-center"
          onClick={() => navigate('/new')}
          icon="+"
        >
          Nuovo Test
        </Button>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            size="lg"
            className="w-full justify-center"
            onClick={() => setView('history')}
          >
            📋 Storico
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full justify-center"
            onClick={() => navigate('/ranking')}
          >
            🏆 Classifiche
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full justify-center"
            onClick={() => navigate('/players')}
          >
            👤 Giocatori
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full justify-center"
            onClick={() => navigate('/instructions')}
          >
            📖 Istruzioni
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full justify-center col-span-2"
            onClick={() => navigate('/settings')}
          >
            ⚙️ Impostazioni
          </Button>
        </div>

        {/* Recent sessions */}
        {recentSessions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Recenti</h2>
              <button onClick={() => setView('history')} className="text-xs text-green-600 font-medium">
                Vedi tutti →
              </button>
            </div>
            <div className="space-y-2">
              {recentSessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/results/${s.id}`)}
                  className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-green-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-900">{s.playerName}</span>
                      <span className="text-gray-400 text-xs ml-2">{s.date}</span>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      {s.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Coach: {s.coach}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {recentSessions.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-sm">Nessun test ancora. Inizia con "Nuovo Test"!</p>
          </div>
        )}
      </div>
    </div>
  );
};
