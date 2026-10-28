import { describe, expect, it } from 'vitest';
import { journalTitle } from './journalTitle';

const key = new Date(2026, 9, 28, 9, 30).getTime();

describe('journalTitle', () => {
  it('uses the title the rider gave it before anything else', () => {
    expect(journalTitle(key, [{ startedAt: key, name: 'Morning loop' }], { [key]: 'Tea at Nandi' })).toBe('Tea at Nandi');
  });
  it('uses the ride name when the journal belongs to a saved ride', () => {
    expect(journalTitle(key, [{ startedAt: key, name: 'Morning loop' }], {})).toBe('Morning loop');
  });
  it('is just the date when it belongs to no ride', () => {
    expect(journalTitle(key, [], {})).toBe('28 Oct 2026');
  });
});
