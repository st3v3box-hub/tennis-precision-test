import React, { useMemo, useState } from 'react';
import type { PlayerProfile } from '../../types';
import { useAppData } from '../../contexts/AppDataContext';
import { duplicatePairs, namesLookAlike, normName, profileName, type DuplicatePair } from '../../lib/playerMatch';

/** What moves when `merge` is folded into `keep` */
function useCounts() {
  const { sessions, killerSessions, matchSessions } = useAppData();
  return (id: string) => ({
    tests: sessions.filter(s => s.playerId === id).length,
    killer: killerSessions.filter(k => k.playerId === id).length,
    match: matchSessions.filter(m => m.playerId === id).length,
  });
}

const countLabel = (c: { tests: number; killer: number; match: number }) =>
  [c.tests && `${c.tests} test`, c.killer && `${c.killer} Killer`, c.match && `${c.match} match`].filter(Boolean).join(', ') || 'nessun test';

const confirmText = (keep: PlayerProfile, merge: PlayerProfile, moved: string) =>
  `Unire «${profileName(merge)}» in «${profileName(keep)}»?\n\n` +
  `${moved} di «${profileName(merge)}» passano a «${profileName(keep)}» e il profilo «${profileName(merge)}» viene eliminato.\n\nNon si può annullare.`;

// ─── Players page: suggested duplicates ──────────────────────────────────────

const DISMISS_KEY = 'tpt_not_duplicates_v1';
const pairKey = (a: string, b: string) => [a, b].sort().join('|');
function readDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]') as string[]; } catch { return []; }
}

/** "Possibili doppioni": profiles that look like the same player, one tap to merge. */
export const DuplicateSuggestions: React.FC = () => {
  const { players, mergePlayers } = useAppData();
  const counts = useCounts();
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);
  const [busy, setBusy] = useState<string | null>(null);
  const [swapped, setSwapped] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<string | null>(null);

  const pairs = useMemo(
    () => duplicatePairs(players).filter(p => !dismissed.includes(pairKey(p.keep.id, p.merge.id))),
    [players, dismissed]
  );
  if (pairs.length === 0 && !done) return null;

  const dismiss = (p: DuplicatePair) => {
    const next = [...dismissed, pairKey(p.keep.id, p.merge.id)];
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const run = async (pair: DuplicatePair) => {
    const k = pairKey(pair.keep.id, pair.merge.id);
    const [keep, merge] = swapped[k] ? [pair.merge, pair.keep] : [pair.keep, pair.merge];
    if (!window.confirm(confirmText(keep, merge, countLabel(counts(merge.id))))) return;
    setBusy(k);
    try {
      await mergePlayers(keep.id, merge.id);
      setDone(`«${profileName(merge)}» unito in «${profileName(keep)}».`);
    } catch (e) {
      alert(`Unione non riuscita: ${e instanceof Error ? e.message : 'errore'}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
      <div>
        <p className="font-display font-bold text-lg text-amber-900">Possibili doppioni</p>
        <p className="text-xs text-amber-800">Profili con lo stesso nome, o un nome contenuto nell'altro. Unendoli, test, Killer e match finiscono in un solo profilo.</p>
      </div>
      {done && <p className="text-sm text-ok-800 bg-ok-50 border border-ok-200 rounded-lg px-3 py-2">✓ {done}</p>}
      {pairs.map(pair => {
        const k = pairKey(pair.keep.id, pair.merge.id);
        const [keep, merge] = swapped[k] ? [pair.merge, pair.keep] : [pair.keep, pair.merge];
        return (
          <div key={k} className="bg-white rounded-xl border border-amber-200 p-3">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
              <div className="min-w-0">
                <p className="text-[11px] text-gray-500">Da unire (verrà eliminato)</p>
                <p className="font-semibold truncate">{profileName(merge)}</p>
                <p className="text-[11px] text-gray-500">{countLabel(counts(merge.id))}</p>
              </div>
              <button type="button" onClick={() => setSwapped(s => ({ ...s, [k]: !s[k] }))}
                className="w-9 h-9 rounded-full border border-gray-300 text-gray-600" title="Inverti: tieni l'altro profilo" aria-label="Inverti">
                ⇄
              </button>
              <div className="min-w-0 text-right">
                <p className="text-[11px] text-gray-500">Profilo che resta</p>
                <p className="font-semibold truncate">{profileName(keep)}</p>
                <p className="text-[11px] text-gray-500">{countLabel(counts(keep.id))}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button type="button" disabled={busy !== null} onClick={() => run(pair)}
                className="flex-1 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold disabled:opacity-50">
                {busy === k ? 'Unione…' : `Unisci in ${keep.firstName}${keep.lastName ? ` ${keep.lastName}` : ''}`}
              </button>
              <button type="button" disabled={busy !== null} onClick={() => dismiss(pair)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-600">
                Persone diverse
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Player page: merge any other profile into this one ─────────────────────

export const MergeIntoPlayer: React.FC<{ keep: PlayerProfile }> = ({ keep }) => {
  const { players, mergePlayers } = useAppData();
  const counts = useCounts();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const others = players.filter(p => p.id !== keep.id);
    const n = normName(q);
    const list = n ? others.filter(p => normName(profileName(p)).includes(n)) : others.filter(p => namesLookAlike(profileName(p), profileName(keep)));
    return list.sort((a, b) => profileName(a).localeCompare(profileName(b))).slice(0, 12);
  }, [players, keep, q]);

  const run = async (merge: PlayerProfile) => {
    if (!window.confirm(confirmText(keep, merge, countLabel(counts(merge.id))))) return;
    setBusy(true);
    try {
      await mergePlayers(keep.id, merge.id);
      setDone(`«${profileName(merge)}» unito in questo profilo.`);
      setOpen(false);
    } catch (e) {
      alert(`Unione non riuscita: ${e instanceof Error ? e.message : 'errore'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {done && <p className="text-sm text-ok-800 bg-ok-50 border border-ok-200 rounded-lg px-3 py-2 mb-2">✓ {done}</p>}
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-brand-700 underline">
          Unisci un profilo doppione in questo
        </button>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">Quale profilo è sempre {profileName(keep)}?</p>
            <button type="button" onClick={() => setOpen(false)} className="text-gray-400 text-lg px-1" aria-label="Chiudi">×</button>
          </div>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cerca un altro profilo…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          {!q && <p className="text-[11px] text-gray-500">Suggeriti: nomi simili. Scrivi per cercare tra tutti.</p>}
          {candidates.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">Nessun profilo trovato.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {candidates.map(p => (
                <li key={p.id} className="py-2 flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate">{profileName(p)}</span>
                    <span className="block text-[11px] text-gray-500">{countLabel(counts(p.id))}{p.dateOfBirth ? ` · nato/a ${p.dateOfBirth}` : ''}</span>
                  </span>
                  <button type="button" disabled={busy} onClick={() => run(p)}
                    className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-bold disabled:opacity-50">
                    Unisci qui
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
