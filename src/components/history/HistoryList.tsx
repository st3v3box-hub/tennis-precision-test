import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TestSession, AppSettings } from '../../types';
import { computeSessionResults } from '../../lib/formulas';
import { deleteSession } from '../../lib/storage';
import { exportHistoryCSV, downloadCSV } from '../../lib/export';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface Props {
  sessions: TestSession[];
  settings: AppSettings;
  onRefresh: () => void;
}

export const HistoryList: React.FC<Props> = ({ sessions, settings, onRefresh }) => {
  const navigate = useNavigate();
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  const toggleCompare = (id: string) => {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const handleDelete = (id: string) => {
    deleteSession(id);
    setDeleteConfirm(null);
    onRefresh();
  };

  const handleExportAll = () => {
    const csv = exportHistoryCSV(sessions);
    downloadCSV(csv, `tpt_storico_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleCompare = () => {
    if (compareIds.length === 2) {
      navigate(`/compare/${compareIds[0]}/${compareIds[1]}`);
    } else if (compareIds.length === 1) {
      navigate(`/results/${compareIds[0]}`);
    }
  };

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-3">🎾</div>
        <p className="font-medium">Nessuna sessione salvata</p>
        <p className="text-sm mt-1">Avvia un nuovo test per iniziare</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{sorted.length} sessione{sorted.length !== 1 ? 'i' : ''}</p>
        <div className="flex gap-2">
          {compareIds.length > 0 && (
            <Button size="sm" onClick={handleCompare}>
              {compareIds.length === 2 ? 'Confronta' : 'Vedi Risultati'}
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={handleExportAll}>
            Export Storico CSV
          </Button>
        </div>
      </div>

      {compareIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-sm text-blue-700">
          {compareIds.length === 1
            ? 'Seleziona una seconda sessione per confrontare i radar'
            : 'Premi "Confronta" per sovrapporre i radar'}
        </div>
      )}

      <div className="space-y-3">
        {sorted.map(session => {
          const r = computeSessionResults(session, settings.stdDevMode);
          const isSelected = compareIds.includes(session.id);
          return (
            <div
              key={session.id}
              className={`bg-white rounded-2xl border-2 p-4 transition-all
                ${isSelected ? 'border-blue-400 shadow-md' : 'border-gray-200 shadow-sm'}
              `}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 mr-3">
                  <h3 className="font-bold text-gray-900">{session.playerName}</h3>
                  <p className="text-xs text-gray-500">
                    {session.date} · {session.category} · Coach: {session.coach}
                    {session.dateOfBirth && (() => {
                      const dob = new Date(session.dateOfBirth);
                      const ref = new Date(session.date);
                      let age = ref.getFullYear() - dob.getFullYear();
                      if (ref.getMonth() < dob.getMonth() || (ref.getMonth() === dob.getMonth() && ref.getDate() < dob.getDate())) age--;
                      return ` · ${age} anni`;
                    })()}
                  </p>
                  {session.note && (
                    <p className="text-xs text-amber-700 italic mt-1 line-clamp-2">{session.note}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-green-700">{r.percentOfIdeal.toFixed(0)}%</span>
                  <p className="text-xs text-gray-400">dell'ideale</p>
                </div>
              </div>

              {/* Mini stat grid */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {r.stats.slice(0, 6).map(s => (
                  <div key={s.stroke} className="text-center bg-gray-50 rounded-lg py-1.5">
                    <div className="text-xs text-gray-500 truncate px-1">{s.label}</div>
                    <div className={`text-base font-black ${
                      s.ave >= 8 ? 'text-green-600' : s.ave >= 5 ? 'text-yellow-600' : 'text-red-500'
                    }`}>{s.ave.toFixed(1)}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  className="flex-1"
                  onClick={() => navigate(`/results/${session.id}`)}
                >
                  Vedi
                </Button>
                <Button
                  size="sm"
                  variant={isSelected ? 'primary' : 'secondary'}
                  onClick={() => toggleCompare(session.id)}
                >
                  {isSelected ? '✓ Sel.' : 'Confronta'}
                </Button>
                {deleteConfirm === session.id ? (
                  <>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(session.id)}>
                      Conferma
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)}>
                      Ann.
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(session.id)}>
                    🗑
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
