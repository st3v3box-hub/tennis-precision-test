import { describe, it, expect } from 'vitest';
import { normName, findExactProfile, namesLookAlike, similarProfiles, duplicatePairs, mergedProfile } from '../src/lib/playerMatch';
import type { PlayerProfile } from '../src/types';

const P = (id: string, firstName: string, lastName = '', extra: Partial<PlayerProfile> = {}): PlayerProfile => ({
  id, firstName, lastName, dateOfBirth: '', createdAt: `2026-11-${id.padStart(2, '0')}`, updatedAt: '', autoCreated: true, ...extra,
});

describe('names', () => {
  it('normalises case, accents and spaces', () => {
    expect(normName('  Làura   VACCARO ')).toBe('laura vaccaro');
  });
  it('look-alike names', () => {
    expect(namesLookAlike('Laura', 'Laura Vaccaro')).toBe(true);
    expect(namesLookAlike('Vaccaro', 'Laura Vaccaro')).toBe(true);
    expect(namesLookAlike('Ale Scialla', 'Alessandro Scialla')).toBe(true);
    expect(namesLookAlike('Vaccaro L', 'Laura Vaccaro')).toBe(true);
    expect(namesLookAlike('Luca Bianchi', 'Luca Rossi')).toBe(false);
    expect(namesLookAlike('Laura Laura', 'Laura Vaccaro')).toBe(false);
    expect(namesLookAlike('', 'Laura')).toBe(false);
  });
});

describe('the Laura case', () => {
  const vaccaro = P('23', 'Laura', 'Vaccaro', { dateOfBirth: '2014-06-07' });
  const laura1 = P('24', 'Laura');
  const laura2 = P('25', 'Laura');
  const others = [P('1', 'Luca', 'Bianchi'), P('2', 'Giulia', 'Rossi')];
  const all = [vaccaro, laura1, laura2, ...others];

  it('typing "Laura" suggests the existing profiles, exact matches first', () => {
    const s = similarProfiles('Laura', all);
    expect(s.map(p => p.id)).toEqual(['24', '25', '23']);
    expect(similarProfiles('laura vaccaro', all)[0].id).toBe('23');
    expect(similarProfiles('L', all)).toEqual([]);
  });
  it('an exact name reuses the oldest profile instead of creating a new one', () => {
    expect(findExactProfile('laura', all)?.id).toBe('24');
    expect(findExactProfile(' LAURA  VACCARO', all)?.id).toBe('23');
    expect(findExactProfile('Laura Verdi', all)).toBeUndefined();
  });
  it('duplicates: both "Laura" go into "Laura Vaccaro" (fullest name kept)', () => {
    const pairs = duplicatePairs(all);
    const withVaccaro = pairs.filter(p => p.keep.id === '23').map(p => p.merge.id).sort();
    expect(withVaccaro).toEqual(['24', '25']);
    // the two "Laura" also pair with each other: the oldest is kept
    expect(pairs.find(p => [p.keep.id, p.merge.id].sort().join() === '24,25')?.keep.id).toBe('24');
    expect(pairs.some(p => [p.keep.id, p.merge.id].includes('1'))).toBe(false);
  });
  it('different birth dates are different people', () => {
    const a = P('3', 'Marco', 'Neri', { dateOfBirth: '2012-01-01' });
    const b = P('4', 'Marco', '', { dateOfBirth: '2015-01-01' });
    expect(duplicatePairs([a, b])).toEqual([]);
  });
  it('merged profile keeps its data and fills the gaps', () => {
    const keep = P('5', 'Laura', 'Vaccaro', { club: undefined, dateOfBirth: '' });
    const merge = P('6', 'Laura', '', { club: 'Casetta Bianca', dateOfBirth: '2014-06-07', notes: 'mancina' });
    const m = mergedProfile(keep, merge, 'now');
    expect(m).toMatchObject({ id: '5', firstName: 'Laura', lastName: 'Vaccaro', club: 'Casetta Bianca', dateOfBirth: '2014-06-07', notes: 'mancina', updatedAt: 'now' });
  });
});

describe('name and surname', () => {
  it('split, join and alphabetical order by surname', async () => {
    const { splitName, joinName, byRegistryName } = await import('../src/lib/playerMatch');
    expect(splitName('  Laura   Vaccaro ')).toEqual({ firstName: 'Laura', lastName: 'Vaccaro' });
    expect(splitName('Laura')).toEqual({ firstName: 'Laura', lastName: '' });
    expect(joinName(' Maria Chiara ', ' Rossi ')).toBe('Maria Chiara Rossi');
    const list = [P('1', 'Zeno', 'Abate'), P('2', 'Anna', 'Vaccaro'), P('3', 'Laura', 'vaccaro'), P('4', 'Luca', 'Ùrsini')];
    expect([...list].sort(byRegistryName).map(p => p.id)).toEqual(['1', '4', '2', '3']);
  });
  it('a new player needs both fields; a registry profile is always fine', async () => {
    const { pickedValid } = await import('../src/components/player/PlayerPicker');
    expect(pickedValid({ firstName: 'Laura', lastName: '' })).toBe(false);
    expect(pickedValid({ firstName: ' ', lastName: 'Vaccaro' })).toBe(false);
    expect(pickedValid({ firstName: 'Laura', lastName: 'Vaccaro' })).toBe(true);
    expect(pickedValid({ profileId: 'x', firstName: 'Laura', lastName: '' })).toBe(true);
  });
});
