import { describe, expect, it } from 'vitest';
import { isReturningRider, type KnownData } from './firstRun';

const fresh: KnownData = { rides: [{ sample: true }], trips: [], todos: [{ id: 'seed-puc' }], profile: { contacts: [] } };

describe('isReturningRider', () => {
  it('is false for a fresh install, which has only the sample ride and the example to-dos', () => expect(isReturningRider(fresh)).toBe(false));
  it('is true with a ride of their own', () => expect(isReturningRider({ ...fresh, rides: [{ sample: true }, {}] })).toBe(true));
  it('is true with a trip, a to-do, a licence, a vehicle or a contact', () => {
    expect(isReturningRider({ ...fresh, trips: [{}] })).toBe(true);
    expect(isReturningRider({ ...fresh, todos: [{ id: 'seed-puc' }, { id: 'abc' }] })).toBe(true);
    expect(isReturningRider({ ...fresh, profile: { contacts: [], licence: {} } })).toBe(true);
    expect(isReturningRider({ ...fresh, profile: { contacts: [], vehicle: {} } })).toBe(true);
    expect(isReturningRider({ ...fresh, profile: { contacts: [{}] } })).toBe(true);
  });
});
