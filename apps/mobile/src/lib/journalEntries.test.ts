import { describe, expect, it } from 'vitest';
import { groupByRide, summarise, type JournalEntry } from './journalEntries';

const e = (id: string, rideKey: number, at: number, kind: JournalEntry['kind'] = 'note'): JournalEntry => ({ id, rideKey, at, kind, ...(kind === 'note' ? { text: 'x' } : {}) });

describe('summarise', () => {
  it('counts notes, voice and photos with plurals, leaving out zeros', () => {
    expect(summarise([e('1', 1, 1), e('2', 1, 2), e('3', 1, 3, 'voice'), e('4', 1, 4, 'photo'), e('5', 1, 5, 'photo'), e('6', 1, 6, 'photo')])).toBe('2 notes · 1 voice · 3 photos');
    expect(summarise([e('1', 1, 1)])).toBe('1 note');
    expect(summarise([e('1', 1, 1, 'photo')])).toBe('1 photo');
  });
  it('is empty text for no entries', () => {
    expect(summarise([])).toBe('');
  });
});

describe('groupByRide', () => {
  it('groups by ride, newest ride first, entries oldest first', () => {
    const g = groupByRide([e('a', 100, 5), e('b', 200, 50), e('c', 100, 3), e('d', 200, 40)]);
    expect(g.map((x) => x.rideKey)).toEqual([200, 100]);
    expect(g[0].entries.map((x) => x.id)).toEqual(['d', 'b']);
    expect(g[1].entries.map((x) => x.id)).toEqual(['c', 'a']);
  });
  it('orders rides by their latest entry, so a journal you just added to comes first', () => {
    const g = groupByRide([e('a', 100, 500), e('b', 200, 50)]);
    expect(g.map((x) => x.rideKey)).toEqual([100, 200]);
  });
  it('is empty for no entries', () => {
    expect(groupByRide([])).toEqual([]);
  });
});
