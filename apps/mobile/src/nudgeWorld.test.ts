import { beforeEach, describe, expect, it, vi } from 'vitest';

type Ride = { startedAt: number; durationSec: number; pausedSec?: number; distanceKm: number; points: { lat: number; lng: number }[]; sample?: boolean; simulated?: true; groupId?: string };
const mk = vi.hoisted(() => async <T extends object>(init: T) => (await import('zustand')).create<T>(() => init));
// Standing is off in these tests: the world only needs to know the rider has not opted in.
vi.mock('@/store/standingPref', () => ({ useStandingPref: { getState: () => ({ optIn: false, cohort: undefined }) } }));
vi.mock('@/store/nudges', async () => ({ useNudges: await mk({ level: 'occasional', muted: [], firstSeenAt: 0, history: [] }) }));
vi.mock('@/store/places', async () => ({ usePlaces: await mk<{ home?: { lat: number; lng: number; label: string; setAt: number } }>({}) }));
vi.mock('@/store/rides', async () => ({ useRides: await mk<{ rides: Ride[] }>({ rides: [] }) }));
vi.mock('@/store/trails', async () => ({ useTrailStore: await mk({ nextTrip: undefined }) }));
vi.mock('@/store/trips', async () => ({ useTrips: await mk<{ trips: { startDate?: string; days?: unknown[] }[] }>({ trips: [] }) }));
import { usePlaces as places } from '@/store/places';
import { useRides as rides } from '@/store/rides';
import { candidates } from '@/lib/nudge/candidates';
import { buildNudgeWorld } from './nudgeWorld';

const NOW = new Date(2026, 10, 12, 18, 0, 0).getTime();
const MIN = 60_000;
const FAR = [{ lat: 0.04, lng: 0 }, { lat: 0.05, lng: 0 }];
/** A ride that ended 5 minutes ago, about 5 km from Home. */
const justEnded = (over: Partial<Ride> = {}): Ride => ({ startedAt: NOW - 35 * MIN, durationSec: 30 * 60, distanceKm: 12, points: FAR, ...over });
const homeCands = () => candidates(buildNudgeWorld(NOW, [])).filter((c) => c.type === 'home');

describe('buildNudgeWorld', () => {
  beforeEach(() => {
    places.setState({ home: { lat: 0, lng: 0, label: 'Home', setAt: 1 } });
    rides.setState({ rides: [] });
  });

  it('a real ride just ended away from Home is a home candidate', () => {
    rides.setState({ rides: [justEnded()] as never });
    expect(homeCands()).toHaveLength(1);
  });

  it('says the last ride was a group ride, and then no home candidate', () => {
    rides.setState({ rides: [justEnded({ startedAt: NOW - 5 * 60 * MIN, durationSec: 60 }), justEnded({ groupId: 'g1' })] as never });
    expect(buildNudgeWorld(NOW, []).lastRideGroup).toBe(true);
    expect(homeCands()).toEqual([]);
    rides.setState({ rides: [justEnded()] as never });
    expect(buildNudgeWorld(NOW, []).lastRideGroup).toBe(false);
  });

  it('a simulated ride is not a ride: no home candidate, no distance and no last ride end', () => {
    rides.setState({ rides: [justEnded({ simulated: true })] as never });
    const w = buildNudgeWorld(NOW, []);
    expect(w.rides).toEqual([]);
    expect(w.yearKm).toBe(0);
    expect(w.lastRideEnd).toBeUndefined();
    expect(homeCands()).toEqual([]);
  });
});
