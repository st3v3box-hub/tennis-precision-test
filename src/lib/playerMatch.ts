import type { PlayerProfile } from '../types';

// Recognising the same player under different spellings ("Laura" / "Laura Vaccaro").

/** "  Làura   VACCARO " → "laura vaccaro" */
export function normName(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const profileName = (p: Pick<PlayerProfile, 'firstName' | 'lastName'>) => `${p.firstName} ${p.lastName}`.trim();

const tokens = (s: string) => normName(s).split(' ').filter(Boolean);

/** Same person, written exactly the same way (case, accents and spaces ignored) */
export function findExactProfile(name: string, players: PlayerProfile[]): PlayerProfile | undefined {
  const n = normName(name);
  if (!n) return undefined;
  const hits = players.filter(p => normName(profileName(p)) === n);
  // Two identical profiles already exist: pick the oldest, the other is a duplicate to merge
  return hits.sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
}

/**
 * Every word of the shorter name starts a word of the longer one, in any order:
 * "Laura" ~ "Laura Vaccaro", "Vaccaro L" ~ "Laura Vaccaro", "Ale Scialla" ~ "Alessandro Scialla".
 */
export function namesLookAlike(a: string, b: string): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return false;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const used = new Set<number>();
  return short.every(w => {
    const i = long.findIndex((x, k) => !used.has(k) && (x.startsWith(w) || w.startsWith(x)));
    if (i < 0) return false;
    used.add(i);
    return true;
  });
}

/** Profiles that may be the player being typed (exact match first) */
export function similarProfiles(name: string, players: PlayerProfile[], max = 3): PlayerProfile[] {
  if (normName(name).length < 2) return [];
  return players
    .filter(p => namesLookAlike(name, profileName(p)))
    .sort((a, b) => {
      const ea = normName(profileName(a)) === normName(name) ? 0 : 1;
      const eb = normName(profileName(b)) === normName(name) ? 0 : 1;
      return ea - eb || profileName(b).length - profileName(a).length;
    })
    .slice(0, max);
}

export interface DuplicatePair {
  /** Profile to keep: the most complete name (then the oldest) */
  keep: PlayerProfile;
  /** Profile to merge into it */
  merge: PlayerProfile;
}

/** Pairs of profiles that look like the same player, for the "possibili doppioni" list */
export function duplicatePairs(players: PlayerProfile[]): DuplicatePair[] {
  const out: DuplicatePair[] = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i];
      const b = players[j];
      if (!namesLookAlike(profileName(a), profileName(b))) continue;
      // Different birth dates = different people (e.g. two Laura in the academy)
      if (a.dateOfBirth && b.dateOfBirth && a.dateOfBirth !== b.dateOfBirth) continue;
      const score = (p: PlayerProfile) => tokens(profileName(p)).join(' ').length * 10 + (p.dateOfBirth ? 5 : 0) + (p.autoCreated ? 0 : 3);
      const [keep, merge] = score(a) > score(b) || (score(a) === score(b) && a.createdAt <= b.createdAt) ? [a, b] : [b, a];
      out.push({ keep, merge });
    }
  }
  return out;
}

/** Fields of the merged profile that fill the gaps of the kept one */
export function mergedProfile(keep: PlayerProfile, merge: PlayerProfile, now: string): PlayerProfile {
  const fill = <K extends keyof PlayerProfile>(k: K) => (keep[k] ? keep[k] : merge[k]);
  return {
    ...keep,
    dateOfBirth: fill('dateOfBirth') ?? '',
    phone: fill('phone'),
    email: fill('email'),
    parentName: fill('parentName'),
    club: fill('club'),
    fitRanking: fill('fitRanking'),
    coachName: fill('coachName'),
    notes: [keep.notes, merge.notes].filter(Boolean).join('\n') || undefined,
    initialAssessment: keep.initialAssessment ?? merge.initialAssessment,
    autoCreated: keep.autoCreated && merge.autoCreated,
    updatedAt: now,
  };
}
