import { beforeEach, describe, expect, it, vi } from 'vitest';

import { newestFirst } from './ridesOrder';
import { ridesAdapter } from './sync/adapters';
import { useRides, type Ride } from '@/store/rides';

// The store persists to AsyncStorage, which needs a phone; an in-memory stand-in is enough here.
vi.mock('@/store/persist', () => ({ storage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }));

const ride = (id: string, startedAt: number): Ride => ({ id, name: id, startedAt, durationSec: 60, distanceKm: 1, maxKmh: 40, points: [], waypoints: [] });
const ids = () => useRides.getState().rides.map((r) => r.id);

describe('newestFirst', () => {
  it('sorts by start time, newest first, and keeps equal times in their order', () => {
    expect(newestFirst([ride('a', 1), ride('b', 3), ride('c', 3), ride('d', 2)]).map((r) => r.id)).toEqual(['b', 'c', 'd', 'a']);
  });
});

describe('a ride pulled by sync', () => {
  beforeEach(() => useRides.setState({ rides: [ride('new', 300), ride('old', 100)] }));
  it('goes where its date puts it, not on top', () => {
    ridesAdapter.put('mid', { name: 'mid', startedAt: 200, durationSec: 60, distanceKm: 1, maxKmh: 40, waypoints: [] }, 1);
    ridesAdapter.put('oldest', { name: 'oldest', startedAt: 50, durationSec: 60, distanceKm: 1, maxKmh: 40, waypoints: [] }, 1);
    expect(ids()).toEqual(['new', 'mid', 'old', 'oldest']);
  });
});
