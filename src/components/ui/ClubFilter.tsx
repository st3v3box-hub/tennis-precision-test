import React, { useMemo, useState, useCallback } from 'react';
import type { PlayerProfile } from '../../types';

const KEY = 'tpt_club_filter';
export const ALL_CLUBS = '';

function readStored(): string {
  try { return localStorage.getItem(KEY) ?? ALL_CLUBS; } catch { return ALL_CLUBS; }
}

/**
 * Club filter shared by lists and rankings. The choice is remembered on this device.
 * Players without a club are only shown under "Tutti i circoli".
 */
export function useClubFilter(players: PlayerProfile[]) {
  const [club, setClubState] = useState<string>(readStored);

  const clubs = useMemo(() => {
    const set = new Map<string, string>(); // lowercase key → display name
    for (const p of players) {
      const c = (p.club ?? '').trim();
      if (c && !set.has(c.toLowerCase())) set.set(c.toLowerCase(), c);
    }
    return [...set.values()].sort((a, b) => a.localeCompare(b, 'it'));
  }, [players]);

  // A remembered club that no longer exists falls back to "all"
  const active = club && clubs.some(c => c.toLowerCase() === club.toLowerCase()) ? club : ALL_CLUBS;

  const clubOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of players) m.set(p.id, (p.club ?? '').trim().toLowerCase());
    return m;
  }, [players]);

  const setClub = useCallback((c: string) => {
    setClubState(c);
    try { localStorage.setItem(KEY, c); } catch { /* storage unavailable: keep in memory */ }
  }, []);

  /** true if the player belongs to the selected club (always true for "all") */
  const matchesPlayer = useCallback(
    (playerId: string) => !active || clubOf.get(playerId) === active.toLowerCase(),
    [active, clubOf]
  );

  return { club: active, clubs, setClub, matchesPlayer };
}

interface Props {
  club: string;
  clubs: string[];
  onChange: (c: string) => void;
  className?: string;
}

export const ClubFilter: React.FC<Props> = ({ club, clubs, onChange, className = '' }) => {
  if (clubs.length === 0) return null;
  return (
    <label className={`flex items-center gap-2 text-sm ${className}`}>
      <span className="text-gray-500 flex-shrink-0">Circolo</span>
      <select
        value={club}
        onChange={e => onChange(e.target.value)}
        className="flex-1 min-w-0 border border-gray-300 rounded-xl px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value={ALL_CLUBS}>Tutti i circoli</option>
        {clubs.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </label>
  );
};
