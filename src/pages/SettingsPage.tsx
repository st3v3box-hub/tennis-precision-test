import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppSettings } from '../types';
import { getSettings, saveSettings } from '../lib/storage';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  const [saved, setSaved] = useState(false);

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
        <Card title="Deviazione Standard">
          <p className="text-xs text-gray-500 mb-3">
            Formula usata per il calcolo della deviazione nei risultati.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(['sample', 'population'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => update({ stdDevMode: mode })}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all
                  ${settings.stdDevMode === mode
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                  }`}
              >
                {mode === 'sample' ? 'Campionaria (n−1)' : 'Popolazione (n)'}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Strategia Precision–Time">
          <p className="text-xs text-gray-500 mb-3">
            Modalità di calcolo del grafico Precision–Time (10 punti).
          </p>
          <div className="space-y-2">
            {([
              { v: 'A', label: 'Strategia A', desc: 'Per ogni punto i: media(FH_i, BH_i, Combined_i) — 1:1 mapping' },
              { v: 'B', label: 'Strategia B', desc: 'Per ogni punto i: media di coppia FH+FH / BH+BH + Combined_i' },
            ] as const).map(({ v, label, desc }) => (
              <button
                key={v}
                onClick={() => update({ precisionTimeStrategy: v })}
                className={`w-full text-left py-3 px-4 rounded-xl border-2 transition-all
                  ${settings.precisionTimeStrategy === v
                    ? 'bg-green-50 border-green-500'
                    : 'bg-white border-gray-200 hover:border-green-300'
                  }`}
              >
                <div className={`font-semibold text-sm ${settings.precisionTimeStrategy === v ? 'text-green-700' : 'text-gray-800'}`}>
                  {label}
                </div>
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
