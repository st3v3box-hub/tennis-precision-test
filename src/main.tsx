import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { LoginPage } from './pages/LoginPage';
import { isAuthenticated } from './lib/auth';
import './index.css';

const Root: React.FC = () => {
  const [authed, setAuthed] = useState(isAuthenticated);

  if (!authed) {
    return <LoginPage onSuccess={() => setAuthed(true)} />;
  }

  return (
    <HashRouter>
      <App onLogout={() => setAuthed(false)} />
    </HashRouter>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
