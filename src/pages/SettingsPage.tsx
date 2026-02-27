import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppSettings } from '../types';
import { getSettings, saveSettings } from '../lib/storage';
import {
  changeCredentials, getCredentials,
  getAccountsByRole, upsertAccount, removeAccount,
  ROLE_LABELS,
} from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

// ── Shared password input ─────────────────────────────────────────────────────

const EyeIcon: React.FC<{ visible: boolean }> = ({ visible }) =>
  visible ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );

const PwdInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }> = ({ value, onChange, placeholder, autoFocus }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoCorrect="off"
        autoCapitalize="off"
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        <EyeIcon visible={show} />
      </button>
    </div>
  );
};

// ── Multi-account card for a given role ───────────────────────────────────────

type ManagedRole = 'coach' | 'viewer';

const MultiAccountCard: React.FC<{ role: ManagedRole }> = ({ role }) => {
  const roleLabel = ROLE_LABELS[role];
  const [accounts, setAccounts] = useState(() => getAccountsByRole(role));
  // formOpen: null = closed, 'new' = adding, string = editing by id
  const [formOpen, setFormOpen] = useState<null | 'new' | string>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [inputUser, setInputUser] = useState('');
  const [inputPwd, setInputPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [formErr, setFormErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const refresh = () => setAccounts(getAccountsByRole(role));

  const openAdd = () => {
    setFormOpen('new');
    setInputUser(''); setInputPwd(''); setConfirmPwd(''); setFormErr(''); setSuccessMsg('');
    setDeleteConfirm(null);
  };

  const openEdit = (id: string, username: string) => {
    setFormOpen(id);
    setInputUser(username); setInputPwd(''); setConfirmPwd(''); setFormErr(''); setSuccessMsg('');
    setDeleteConfirm(null);
  };

  const closeForm = () => {
    setFormOpen(null);
    setFormErr('');
  };

  const isEditing = formOpen !== null && formOpen !== 'new';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr('');

    if (!inputUser.trim()) { setFormErr('Username obbligatorio.'); return; }
    if (!isEditing) {
      if (inputPwd.length < 4) { setFormErr('Password di almeno 4 caratteri.'); return; }
      if (inputPwd !== confirmPwd) { setFormErr('Le password non coincidono.'); return; }
    } else if (inputPwd) {
      if (inputPwd.length < 4) { setFormErr('Password di almeno 4 caratteri.'); return; }
      if (inputPwd !== confirmPwd) { setFormErr('Le password non coincidono.'); return; }
    }

    const editId = isEditing ? formOpen! : undefined;
    await upsertAccount(role, inputUser.trim(), inputPwd, editId);
    refresh();
    closeForm();
    setSuccessMsg(isEditing ? `Account "${inputUser.trim()}" aggiornato.` : `Account "${inputUser.trim()}" creato.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDelete = (id: string) => {
    removeAccount(id);
    refresh();
    setDeleteConfirm(null);
    if (formOpen === id) closeForm();
  };

  return (
    <Card title={`${roleLabel} — ${accounts.length} account`}>
      <div className="space-y-2">

        {/* Success banner */}
        {successMsg && (
          <p className="text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-xl">
            ✓ {successMsg}
          </p>
        )}

        {/* Empty state */}
        {accounts.length === 0 && formOpen === null && (
          <p className="text-xs text-gray-400 py-1">Nessun account {roleLabel} configurato.</p>
        )}

        {/* Account list */}
        {accounts.map(acc => (
          <div key={acc.id} className="space-y-2">
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors
              ${formOpen === acc.id ? 'border-green-300 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
              <span className="text-sm font-medium text-gray-800 flex-1 truncate">{acc.username}</span>
              <button
                type="button"
                onClick={() => formOpen === acc.id ? closeForm() : openEdit(acc.id, acc.username)}
                className="text-xs text-gray-500 hover:text-green-600 font-medium px-2 py-1 rounded transition-colors"
              >
                {formOpen === acc.id ? '×' : 'Modifica'}
              </button>
              {deleteConfirm === acc.id ? (
                <>
                  <button onClick={() => handleDelete(acc.id)} className="text-xs text-red-600 font-bold px-2 py-1 rounded">Elimina</button>
                  <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-400 px-2 py-1 rounded">Ann.</button>
                </>
              ) : (
                <button onClick={() => { setDeleteConfirm(acc.id); closeForm(); }}
                  className="text-xs text-gray-300 hover:text-red-500 px-2 py-1 rounded transition-colors">🗑</button>
              )}
            </div>

            {/* Inline edit form */}
            {formOpen === acc.id && (
              <form onSubmit={handleSave} className="pl-3 border-l-2 border-green-300 space-y-2 py-1">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
                  <input type="text" value={inputUser} onChange={e => setInputUser(e.target.value)}
                    autoCorrect="off" autoCapitalize="off"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Nuova password <span className="text-gray-400 font-normal">(lascia vuoto per non cambiare)</span>
                  </label>
                  <PwdInput value={inputPwd} onChange={setInputPwd} placeholder="Nuova password" />
                </div>
                {inputPwd && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Conferma password</label>
                    <PwdInput value={confirmPwd} onChange={setConfirmPwd} placeholder="Ripeti password" />
                  </div>
                )}
                {formErr && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-1.5">{formErr}</p>}
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-green-700 text-white text-xs font-bold py-2 rounded-xl hover:bg-green-800 transition-colors">Salva</button>
                  <button type="button" onClick={closeForm} className="px-3 text-xs text-gray-500 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Ann.</button>
                </div>
              </form>
            )}
          </div>
        ))}

        {/* Add new form */}
        {formOpen === 'new' && (
          <form onSubmit={handleSave} className="border border-green-200 rounded-xl p-3 bg-green-50 space-y-2">
            <p className="text-xs font-bold text-green-700 mb-1">Nuovo account {roleLabel}</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
              <input type="text" value={inputUser} onChange={e => setInputUser(e.target.value)}
                placeholder="Es. mario.rossi" autoFocus
                autoCorrect="off" autoCapitalize="off"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <PwdInput value={inputPwd} onChange={setInputPwd} placeholder="Password" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Conferma password</label>
              <PwdInput value={confirmPwd} onChange={setConfirmPwd} placeholder="Ripeti password" />
            </div>
            {formErr && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-1.5">{formErr}</p>}
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-green-700 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-green-800 transition-colors">Crea Account</button>
              <button type="button" onClick={closeForm} className="px-3 text-xs text-gray-500 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50">Ann.</button>
            </div>
          </form>
        )}

        {/* Add button */}
        {formOpen === null && (
          <button type="button" onClick={openAdd}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-green-400 hover:text-green-600 transition-colors font-medium">
            + Aggiungi {roleLabel}
          </button>
        )}
      </div>
    </Card>
  );
};

// ── Main settings page ────────────────────────────────────────────────────────

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  const [saved, setSaved] = useState(false);

  const currentUsername = getCredentials()?.username ?? '';
  const [currentPwd, setCurrentPwd] = useState('');
  const [newUsername, setNewUsername] = useState(currentUsername);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [credMsg, setCredMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleChangeCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredMsg(null);
    if (!newUsername.trim()) { setCredMsg({ type: 'err', text: 'Username non può essere vuoto.' }); return; }
    if (newPwd.length < 4) { setCredMsg({ type: 'err', text: 'La nuova password deve essere di almeno 4 caratteri.' }); return; }
    if (newPwd !== confirmPwd) { setCredMsg({ type: 'err', text: 'Le password non coincidono.' }); return; }
    const ok = await changeCredentials(currentPwd, newUsername, newPwd);
    if (!ok) {
      setCredMsg({ type: 'err', text: 'Password attuale errata.' });
    } else {
      setCredMsg({ type: 'ok', text: 'Credenziali aggiornate!' });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    }
  };

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 text-xl">←</button>
        <h1 className="text-lg font-bold">Impostazioni</h1>
        {saved && <span className="ml-auto text-xs text-green-600 font-medium">Salvato ✓</span>}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Account management */}
        <div>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Gestione Account</h2>
          <div className="space-y-3">
            <MultiAccountCard role="coach" />
            <MultiAccountCard role="viewer" />
          </div>
        </div>

        {/* Change admin credentials */}
        <Card title="Credenziali Amministratore">
          <p className="text-xs text-gray-500 mb-3">
            Account attuale: <strong>{currentUsername}</strong>
          </p>
          <form onSubmit={handleChangeCredentials} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password attuale</label>
              <PwdInput value={currentPwd} onChange={setCurrentPwd} placeholder="Password attuale" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nuovo username</label>
              <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)}
                autoCorrect="off" autoCapitalize="off"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nuova password</label>
              <PwdInput value={newPwd} onChange={setNewPwd} placeholder="Nuova password" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Conferma nuova password</label>
              <PwdInput value={confirmPwd} onChange={setConfirmPwd} placeholder="Ripeti nuova password" />
            </div>
            {credMsg && (
              <p className={`text-xs px-3 py-2 rounded-xl border ${credMsg.type === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {credMsg.text}
              </p>
            )}
            <button type="submit"
              className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
              Aggiorna Credenziali
            </button>
          </form>
        </Card>

        {/* App settings */}
        <Card title="Deviazione Standard">
          <p className="text-xs text-gray-500 mb-3">Formula usata per il calcolo della deviazione nei risultati.</p>
          <div className="grid grid-cols-2 gap-3">
            {(['sample', 'population'] as const).map(mode => (
              <button key={mode} onClick={() => update({ stdDevMode: mode })}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all
                  ${settings.stdDevMode === mode
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'}`}>
                {mode === 'sample' ? 'Campionaria (n−1)' : 'Popolazione (n)'}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Strategia Precision–Time">
          <p className="text-xs text-gray-500 mb-3">Modalità di calcolo del grafico Precision–Time (10 punti).</p>
          <div className="space-y-2">
            {([
              { v: 'A', label: 'Strategia A', desc: 'Per ogni punto i: media(FH_i, BH_i, Combined_i) — 1:1 mapping' },
              { v: 'B', label: 'Strategia B', desc: 'Per ogni punto i: media di coppia FH+FH / BH+BH + Combined_i' },
            ] as const).map(({ v, label, desc }) => (
              <button key={v} onClick={() => update({ precisionTimeStrategy: v })}
                className={`w-full text-left py-3 px-4 rounded-xl border-2 transition-all
                  ${settings.precisionTimeStrategy === v
                    ? 'bg-green-50 border-green-500'
                    : 'bg-white border-gray-200 hover:border-green-300'}`}>
                <div className={`font-semibold text-sm ${settings.precisionTimeStrategy === v ? 'text-green-700' : 'text-gray-800'}`}>{label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
              </button>
            ))}
          </div>
        </Card>

        <Button variant="secondary" className="w-full justify-center" onClick={() => navigate('/')}>
          ← Torna alla Home
        </Button>
      </div>
    </div>
  );
};
