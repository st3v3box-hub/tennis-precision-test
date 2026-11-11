import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { LoginPage } from './pages/LoginPage';
import { isAuthenticated, getCurrentRole } from './lib/auth';
import type { UserRole } from './lib/auth';
import './index.css';

const Root: React.FC = () => {
  const [authed, setAuthed] = useState(isAuthenticated);
  const [role, setRole] = useState<UserRole>(() => getCurrentRole() ?? 'viewer');

  const handleSuccess = () => {
    // Read the role from sessionStorage RIGHT after login() has set it
    setRole(getCurrentRole() ?? 'viewer');
    setAuthed(true);
  };

  if (!authed) {
    return <LoginPage onSuccess={handleSuccess} />;
  }

  return (
    <HashRouter>
      <App role={role} onLogout={() => setAuthed(false)} />
    </HashRouter>
  );
};

// Offline app shell (production builds on HTTPS only; never in local dev)
if (import.meta.env.PROD && 'serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('Service worker not registered:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
