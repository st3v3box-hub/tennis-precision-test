import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { UserRole } from './lib/auth';
import { can } from './lib/auth';
import { HomePage } from './pages/HomePage';
import { NewSessionPage } from './pages/NewSessionPage';
import { SessionResultsPage } from './pages/SessionResultsPage';
import { CompareSessionsPage } from './pages/CompareSessionsPage';
import { SettingsPage } from './pages/SettingsPage';
import { MultiResultsPage } from './pages/MultiResultsPage';
import { InstructionsPage } from './pages/InstructionsPage';
import { RankingPage } from './pages/RankingPage';
import { PlayersPage } from './pages/PlayersPage';
import { PlayerFormPage } from './pages/PlayerFormPage';
import { PlayerDetailPage } from './pages/PlayerDetailPage';
import { ChallengeResultsPage } from './pages/ChallengeResultsPage';
import { ChallengePage } from './pages/ChallengePage';

interface Props {
  role: UserRole;
  onLogout: () => void;
}

const App: React.FC<Props> = ({ role, onLogout }) => (
  <Routes>
    <Route path="/" element={<HomePage role={role} onLogout={onLogout} />} />
    <Route path="/ranking" element={<RankingPage />} />
    <Route path="/instructions" element={<InstructionsPage />} />
    <Route path="/players" element={<PlayersPage />} />
    <Route path="/players/:id" element={<PlayerDetailPage />} />
    <Route path="/results/:id" element={<SessionResultsPage />} />
    <Route path="/multi-results" element={<MultiResultsPage />} />

    {/* Coach + Admin only */}
    {can('createTest') && (
      <>
        <Route path="/new" element={<NewSessionPage />} />
        <Route path="/challenge" element={<ChallengePage />} />
        <Route path="/challenge-results" element={<ChallengeResultsPage />} />
        <Route path="/compare/:id1/:id2" element={<CompareSessionsPage />} />
      </>
    )}
    {can('editPlayers') && (
      <>
        <Route path="/players/new" element={<PlayerFormPage />} />
        <Route path="/players/:id/edit" element={<PlayerFormPage />} />
      </>
    )}
    {can('manageAccounts') && (
      <Route path="/settings" element={<SettingsPage />} />
    )}

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
