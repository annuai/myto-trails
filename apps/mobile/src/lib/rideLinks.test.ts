import { describe, expect, it } from 'vitest';
import { companionLinks } from './rideLinks';

describe('companionLinks', () => {
  it('names the group ride and check-in a ride was recorded under', () => {
    expect(companionLinks({ group: { id: 'g1' }, checkin: { id: 'c1' } })).toEqual({ groupId: 'g1', checkinId: 'c1' });
  });
  it('names only what there was', () => {
    expect(companionLinks({ group: { id: 'g1' }, checkin: null })).toEqual({ groupId: 'g1' });
    expect(companionLinks({ group: null, checkin: { id: 'c1' } })).toEqual({ checkinId: 'c1' });
  });
  it('is nothing for a solo ride with no check-in', () => {
    expect(companionLinks({ group: null, checkin: null })).toBeUndefined();
    expect(companionLinks({})).toBeUndefined();
  });
});
