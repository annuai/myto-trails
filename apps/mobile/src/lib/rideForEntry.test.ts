import { describe, expect, it } from 'vitest';
import { rideForEntry } from './rideForEntry';

const rides = [{ id: 'a', startedAt: 100 }, { id: 'b', startedAt: 300 }, { id: 'c', startedAt: 200 }];
describe('rideForEntry', () => {
  it('uses the ride the entry belongs to', () => expect(rideForEntry({ rideId: 'a' }, rides)).toBe('a'));
  it('falls back to the latest ride when the entry has none, or its ride is gone', () => {
    expect(rideForEntry({}, rides)).toBe('b');
    expect(rideForEntry({ rideId: 'zzz' }, rides)).toBe('b');
  });
  it('is undefined with no rides', () => expect(rideForEntry({}, [])).toBeUndefined());
});
