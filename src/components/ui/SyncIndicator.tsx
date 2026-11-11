import React from 'react';
import { useAppData } from '../../contexts/AppDataContext';

/**
 * Small status pill at the bottom of the screen.
 * Hidden when everything is online and synced; visible when the device is offline,
 * when saves are waiting for the server, or when the server rejected a save.
 */
export const SyncIndicator: React.FC = () => {
  const { sync, clearSyncError } = useAppData();

  if (sync.error) {
    return (
      <div role="alert" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl bg-red-600 text-white shadow-lg px-4 py-3 text-sm flex items-start gap-3">
        <span className="flex-1">
          <strong>Salvataggio non riuscito.</strong> {sync.error}
        </span>
        <button onClick={clearSyncError} className="font-bold text-white/80 hover:text-white" aria-label="Chiudi">✕</button>
      </div>
    );
  }

  if (sync.online && sync.pending === 0) return null;

  const text = !sync.online
    ? sync.pending > 0
      ? `Offline · ${sync.pending} ${sync.pending === 1 ? 'modifica salvata' : 'modifiche salvate'} sul telefono, verranno inviate appena torna la rete`
      : 'Offline · puoi continuare, i dati restano sul telefono'
    : `Sincronizzazione in corso (${sync.pending})…`;

  return (
    <div role="status" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-full bg-neutral-900/95 text-white shadow-lg px-4 py-2 text-xs flex items-center gap-2">
      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${sync.online ? 'bg-amber-400 animate-pulse' : 'bg-brand-500'}`} />
      <span>{text}</span>
    </div>
  );
};
