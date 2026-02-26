import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { NewSessionPage } from './pages/NewSessionPage';
import { SessionResultsPage } from './pages/SessionResultsPage';
import { CompareSessionsPage } from './pages/CompareSessionsPage';
import { SettingsPage } from './pages/SettingsPage';
import { MultiResultsPage } from './pages/MultiResultsPage';
import { InstructionsPage } from './pages/InstructionsPage';
import { RankingPage } from './pages/RankingPage';

const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/new" element={<NewSessionPage />} />
    <Route path="/results/:id" element={<SessionResultsPage />} />
    <Route path="/compare/:id1/:id2" element={<CompareSessionsPage />} />
    <Route path="/multi-results" element={<MultiResultsPage />} />
    <Route path="/settings" element={<SettingsPage />} />
    <Route path="/instructions" element={<InstructionsPage />} />
    <Route path="/ranking" element={<RankingPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
