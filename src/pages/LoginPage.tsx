import React, { useState } from 'react';
import { isFirstRun, login, setupAccount } from '../lib/auth';

interface Props {
  onSuccess: () => void;
}

const EyeIcon: React.FC<{ visible: boolean }> = ({ visible }) =>
  visible ? (
    // Eye open
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    // Eye off
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );

const PasswordInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
}> = ({ value, onChange, placeholder = 'Password', id }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        tabIndex={-1}
        aria-label={show ? 'Nascondi password' : 'Mostra password'}
      >
        <EyeIcon visible={show} />
      </button>
    </div>
  );
};

export const LoginPage: React.FC<Props> = ({ onSuccess }) => {
  const firstRun = isFirstRun();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Inserisci username e password.');
      return;
    }

    if (firstRun) {
      if (password.length < 4) {
        setError('La password deve essere di almeno 4 caratteri.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Le password non coincidono.');
        return;
      }
      setLoading(true);
      await setupAccount(username, password);
      onSuccess();
      return;
    }

    setLoading(true);
    const ok = await login(username, password);
    setLoading(false);
    if (!ok) {
      setError('Username o password errati.');
    } else {
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 to-green-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo + title */}
        <div className="flex flex-col items-center mb-8">
          <img src="./logo.png" alt="GT Logo" className="h-20 w-auto drop-shadow-lg mb-4" />
          <h1 className="text-2xl font-black text-white tracking-tight">Tennis Precision Test</h1>
          <p className="text-green-200 text-sm mt-1">
            {firstRun ? 'Crea il tuo account' : 'Accedi per continuare'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-5">
            {firstRun ? 'Configura Account' : 'Accesso'}
          </h2>

          {firstRun && (
            <p className="text-xs text-gray-500 mb-4 bg-green-50 border border-green-200 rounded-xl p-3">
              Prima configurazione — crea le credenziali che userai per accedere all'app.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Es. coach"
                autoComplete="username"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder="Password"
                id="password"
              />
            </div>

            {firstRun && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conferma Password</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Ripeti la password"
                  id="confirm-password"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-sm"
            >
              {loading ? '...' : firstRun ? 'Crea Account' : 'Accedi'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
