import React, { useMemo, useState } from 'react';
import type { PlayerProfile } from '../../types';
import { byRegistryName, joinName, normName, profileName, similarProfiles } from '../../lib/playerMatch';
import { PlayerNameFields } from './PlayerNameFields';

export interface PickedPlayer {
  profileId?: string;
  firstName: string;
  lastName: string;
}

export const emptyPick: PickedPlayer = { firstName: '', lastName: '' };

export const pickFromProfile = (p: PlayerProfile): PickedPlayer => ({ profileId: p.id, firstName: p.firstName, lastName: p.lastName });

/** Name to store with the test */
export const pickedName = (v: PickedPlayer) => joinName(v.firstName, v.lastName);

/** A registry profile, or a new player with both name and surname */
export const pickedValid = (v: PickedPlayer) => !!v.profileId || (!!v.firstName.trim() && !!v.lastName.trim());

/**
 * Player choice for Killer and Match: the registry first (alphabetical, searchable),
 * otherwise a new player with Nome and Cognome; similar names are offered before
 * a duplicate gets created.
 */
export const PlayerPicker: React.FC<{
  players: PlayerProfile[];
  value: PickedPlayer;
  onChange: (v: PickedPlayer, linked?: PlayerProfile) => void;
}> = ({ players, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const n = normName(q);
    return players
      .filter(p => !n || normName(`${p.firstName} ${p.lastName}`).includes(n) || normName(`${p.lastName} ${p.firstName}`).includes(n) || normName(p.club ?? '').includes(n))
      .sort(byRegistryName);
  }, [players, q]);

  const link = (p: PlayerProfile) => {
    onChange(pickFromProfile(p), p);
    setOpen(false);
    setQ('');
  };

  if (value.profileId) {
    const p = players.find(x => x.id === value.profileId);
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-ok-300 bg-ok-50 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs text-ok-700 font-semibold">✓ Dall'anagrafica</p>
          <p className="font-bold text-ink truncate">{p ? profileName(p) : pickedName(value)}</p>
          {p?.club && <p className="text-xs text-gray-500">{p.club}</p>}
        </div>
        <button type="button" onClick={() => onChange({ ...emptyPick })} className="text-sm font-semibold text-brand-700 underline flex-shrink-0">
          Cambia
        </button>
      </div>
    );
  }

  const similar = similarProfiles(pickedName(value), players);

  return (
    <div>
      {players.length > 0 && (
        <button type="button" onClick={() => { setOpen(o => !o); setQ(''); }} aria-expanded={open}
          className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-colors ${
            open ? 'border-brand-600 bg-brand-600 text-white' : 'border-brand-600 bg-brand-50 text-brand-800'}`}>
          <span className="min-w-0">
            <span className="block font-bold">Scegli dall'anagrafica</span>
            <span className={`block text-xs ${open ? 'text-white/80' : 'text-brand-700'}`}>{players.length} giocatori, in ordine alfabetico</span>
          </span>
          <span className="text-lg" aria-hidden>{open ? '▲' : '▼'}</span>
        </button>
      )}
      {open && (
        <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
          <div className="p-2 border-b border-gray-100">
            <input type="search" value={q} onChange={e => setQ(e.target.value)} autoFocus
              placeholder="Cerca per nome, cognome o circolo…"
              className="w-full text-base px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
          <div className="max-h-72 overflow-y-auto overscroll-contain">
            {list.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Nessun profilo trovato</p>
            ) : list.map(p => (
              <button key={p.id} type="button" onClick={() => link(p)}
                className="w-full text-left px-3 py-3 hover:bg-brand-50 active:bg-brand-100 border-b border-gray-50 last:border-0">
                <p className="text-sm font-semibold text-gray-800">{p.lastName} {p.firstName}</p>
                <p className="text-xs text-gray-400">{[p.dateOfBirth, p.club].filter(Boolean).join(' · ')}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4 mb-2">{players.length > 0 ? 'Oppure nuovo giocatore:' : 'Nuovo giocatore:'}</p>
      <PlayerNameFields firstName={value.firstName} lastName={value.lastName}
        onChange={(firstName, lastName) => onChange({ firstName, lastName })} />

      {similar.length > 0 && (
        <div className="mt-2 rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-2.5">
          <p className="text-xs font-semibold text-amber-900">È già in anagrafica? Tocca per collegarlo ed evitare un doppione</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {similar.map(sp => (
              <button key={sp.id} type="button" onClick={() => link(sp)}
                className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-sm font-semibold text-ink">
                {profileName(sp)}{sp.club ? <span className="text-gray-400 font-normal"> · {sp.club}</span> : null}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
