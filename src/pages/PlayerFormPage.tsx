import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PlayerProfile, InitialAssessment } from '../types';
import { getPlayerProfile, upsertPlayerProfile, uid } from '../lib/storage';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StarPicker } from '../components/ui/StarPicker';

const STROKE_FIELDS: { key: keyof InitialAssessment; label: string }[] = [
  { key: 'serve', label: 'Servizio' },
  { key: 'forehand', label: 'Forehand (Dritto)' },
  { key: 'backhand', label: 'Backhand (Rovescio)' },
  { key: 'volley', label: 'Volley' },
  { key: 'return', label: 'Return' },
  { key: 'combined', label: 'Combined' },
  { key: 'movement', label: 'Mobilità / Atletismo' },
];

export const PlayerFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const existing = id ? getPlayerProfile(id) : undefined;

  const [firstName, setFirstName] = useState(existing?.firstName ?? '');
  const [lastName, setLastName] = useState(existing?.lastName ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(existing?.dateOfBirth ?? '');

  // Optional
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [parentName, setParentName] = useState(existing?.parentName ?? '');
  const [club, setClub] = useState(existing?.club ?? '');
  const [fitRanking, setFitRanking] = useState(existing?.fitRanking ?? '');
  const [coachName, setCoachName] = useState(existing?.coachName ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  // Initial assessment
  const [assessment, setAssessment] = useState<InitialAssessment>(
    existing?.initialAssessment ?? {}
  );
  const [showOptional, setShowOptional] = useState(isEdit);
  const [showAssessment, setShowAssessment] = useState(isEdit && !!existing?.initialAssessment);

  const [error, setError] = useState('');

  const updateAssessment = (patch: Partial<InitialAssessment>) =>
    setAssessment(a => ({ ...a, ...patch }));

  const handleSave = () => {
    if (!firstName.trim() || !lastName.trim() || !dateOfBirth) {
      setError('Nome, Cognome e Data di Nascita sono obbligatori.');
      return;
    }
    const now = new Date().toISOString();
    const profile: PlayerProfile = {
      id: existing?.id ?? uid(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth,
      phone: phone || undefined,
      email: email || undefined,
      parentName: parentName || undefined,
      club: club || undefined,
      fitRanking: fitRanking || undefined,
      coachName: coachName || undefined,
      notes: notes || undefined,
      initialAssessment: Object.keys(assessment).length > 0 ? assessment : undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    upsertPlayerProfile(profile);
    navigate(`/players/${profile.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 text-xl">←</button>
        <h1 className="text-lg font-bold text-gray-900">
          {isEdit ? 'Modifica Giocatore' : 'Nuovo Giocatore'}
        </h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Required */}
        <Card title="Dati Anagrafici">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                  placeholder="Mario" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cognome *</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                  placeholder="Rossi" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Data di Nascita *</label>
              <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
        </Card>

        {/* Optional toggle */}
        <button
          onClick={() => setShowOptional(s => !s)}
          className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-green-400 transition-colors"
        >
          <span>Profilo Completo <span className="text-gray-400 font-normal">(opzionale)</span></span>
          <span className="text-gray-400">{showOptional ? '▲' : '▼'}</span>
        </button>

        {showOptional && (
          <Card title="Profilo Completo">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Telefono</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+39 333 000 0000" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="mario@email.it" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome Genitore</label>
                <input type="text" value={parentName} onChange={e => setParentName(e.target.value)}
                  placeholder="Per i giocatori minorenni" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Club / Accademia</label>
                  <input type="text" value={club} onChange={e => setClub(e.target.value)}
                    placeholder="TC Roma" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Classifica FIT</label>
                  <input type="text" value={fitRanking} onChange={e => setFitRanking(e.target.value)}
                    placeholder="Es. 3.1" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Coach di Riferimento</label>
                <input type="text" value={coachName} onChange={e => setCoachName(e.target.value)}
                  placeholder="Nome coach" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Note generali</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Osservazioni, caratteristiche del giocatore..." rows={3}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>
            </div>
          </Card>
        )}

        {/* Initial assessment toggle */}
        <button
          onClick={() => setShowAssessment(s => !s)}
          className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-green-400 transition-colors"
        >
          <span>Scheda Valutazione Iniziale <span className="text-gray-400 font-normal">(opzionale)</span></span>
          <span className="text-gray-400">{showAssessment ? '▲' : '▼'}</span>
        </button>

        {showAssessment && (
          <Card title="Valutazione Iniziale">
            <p className="text-xs text-gray-500 mb-4">
              Valutazione qualitativa del coach prima dei test. Clicca le stelle per assegnare un punteggio.
            </p>
            <div className="space-y-3">
              {STROKE_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 font-medium w-40">{label}</span>
                  <StarPicker
                    value={assessment[key] as number | undefined}
                    onChange={v => updateAssessment({ [key]: v })}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Data Valutazione</label>
                <input
                  type="date"
                  value={assessment.assessmentDate ?? ''}
                  onChange={e => updateAssessment({ assessmentDate: e.target.value || undefined })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Note del Coach</label>
                <textarea
                  value={assessment.coachNotes ?? ''}
                  onChange={e => updateAssessment({ coachNotes: e.target.value || undefined })}
                  placeholder="Osservazioni tecniche, punti di forza, aree di miglioramento..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
            </div>
          </Card>
        )}

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
        )}

        <Button size="lg" className="w-full justify-center" onClick={handleSave}>
          {isEdit ? 'Salva Modifiche' : 'Crea Giocatore'}
        </Button>
      </div>
    </div>
  );
};
