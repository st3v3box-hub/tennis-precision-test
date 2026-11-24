import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { WizardContainer } from '../components/wizard/WizardContainer';
import { autosaveSummary, clearAutosave, readAutosave } from '../lib/wizardAutosave';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

/**
 * New test. If a test was left unsaved on this phone (browser closed, battery…),
 * ask first whether to continue it, so nothing gets lost by starting a new one.
 */
export const NewSessionPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const plainNew = !location.state; // quick start, resume and challenge bring their own data
  const [pending, setPending] = useState(() => (plainNew ? readAutosave() : null));

  if (pending) {
    const s = autosaveSummary(pending);
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader title="Nuovo test" backTo="/" />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Card title="C'è un test non salvato">
            <p className="text-sm text-gray-700">
              <strong>{s.names}</strong> · {s.series} serie inserite{s.time ? ` · ultima modifica ${s.time}` : ''}.
            </p>
            <p className="text-xs text-gray-500 mt-1">Il browser si è chiuso prima del salvataggio: le serie sono rimaste sul telefono.</p>
            <div className="flex gap-3 mt-4">
              <Button className="flex-1 justify-center" onClick={() => { setPending(null); navigate('/new', { replace: true, state: { restoreLocal: true } }); }}>
                Riprendi il test
              </Button>
              <Button variant="secondary" className="flex-1 justify-center" onClick={() => {
                if (window.confirm('Iniziare un test nuovo? Le serie del test non salvato andranno perse (se era già stato salvato in bozza, la bozza resta nello storico).')) {
                  clearAutosave();
                  setPending(null);
                }
              }}>
                Inizia nuovo
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }
  return <WizardContainer key={location.key} />;
};
