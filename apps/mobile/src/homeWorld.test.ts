import { beforeEach, describe, expect, it, vi } from 'vitest';

const acquire = vi.hoisted(() => vi.fn());
type Ride = { startedAt: number; durationSec: number; pausedSec?: number; distanceKm: number; sample?: boolean; simulated?: true };
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-location', () => ({ Accuracy: { Balanced: 3 } }));
const mk = vi.hoisted(() => async <T extends object>(init: T) => (await import('zustand')).create<T>(() => init));
vi.mock('@/store/places', async () => ({ usePlaces: await mk<{ home?: { lat: number; lng: number; label: string; setAt: number } }>({}) }));
vi.mock('@/store/homeOffer', async () => ({ useHomeOffer: await mk<{ dismissals: number[] }>({ dismissals: [] }) }));
vi.mock('@/store/location', async () => ({ useLocation: await mk<{ fix?: { lat: number; lng: number; t: number }; fixAt?: number; acquire: () => void }>({ acquire }) }));
vi.mock('@/store/recorder', async () => ({ useRecorder: await mk<{ status: 'idle' | 'running'; points: { lat: number; lng: number }[]; lastFixAt: number }>({ status: 'idle', points: [], lastFixAt: 0 }) }));
vi.mock('@/store/rides', async () => ({ useRides: await mk<{ rides: Ride[] }>({ rides: [] }) }));
vi.mock('@/store/trips', async () => ({ useTrips: await mk<{ trips: { startDate?: string; days?: unknown[] }[] }>({ trips: [] }) }));
vi.mock('@/store/companion', async () => ({ useCompanion: await mk<{ group: unknown }>({ group: null }) }));
import { usePlaces as places } from '@/store/places';
import { useHomeOffer as offer } from '@/store/homeOffer';
import { useLocation as loc } from '@/store/location';
import { useRecorder as rec } from '@/store/recorder';
import { useRides as rides } from '@/store/rides';
import { useTrips as trips } from '@/store/trips';
import { useCompanion as companion } from '@/store/companion';

import { buildHomeWorld, needsQuickReading } from './homeWorld';
import { decideHomeOffer } from './lib/homeRoute/offer';
import { resetQuickPosition } from './features/home/quickPosition';

const NOW = new Date(2026, 10, 12, 18, 0, 0).getTime();
const H = 3_600_000;

describe('buildHomeWorld', () => {
  beforeEach(() => {
    places.setState({ home: undefined });
    offer.setState({ dismissals: [] });
    loc.setState({ fix: undefined, fixAt: undefined });
    rec.setState({ status: 'idle', points: [], lastFixAt: 0 });
    rides.setState({ rides: [] });
    trips.setState({ trips: [] });
    companion.setState({ group: null });
    resetQuickPosition();
    acquire.mockClear();
  });
  it('maps the latest real ride end, ignoring sample rides', () => {
    rides.setState({ rides: [
      { startedAt: NOW - 3 * H, durationSec: 3600, distanceKm: 10 },
      { startedAt: NOW - 1 * H, durationSec: 600, pausedSec: 60, distanceKm: 3, sample: true },
    ] as never });
    expect(buildHomeWorld(NOW).lastRide).toEqual({ endedAt: NOW - 2 * H, sample: undefined });
    rides.setState({ rides: [{ startedAt: NOW - 1 * H, durationSec: 600, distanceKm: 3, sample: true }] as never });
    expect(buildHomeWorld(NOW).lastRide).toBeUndefined();
  });
  it('ignores simulated rides: a simulated ride just ended offers no Ride home and teaches no habit', () => {
    const at = (d: number) => new Date(2026, 10, 12 - d, 8, 10).getTime();
    rides.setState({ rides: [
      ...[1, 2, 3].map((d) => ({ startedAt: at(d), durationSec: 1800, distanceKm: 10, simulated: true as const })),
      { startedAt: NOW - 20 * 60_000, durationSec: 600, distanceKm: 3, simulated: true as const },
    ] });
    places.setState({ home: { lat: 0, lng: 0, label: 'H', setAt: 1 } });
    loc.setState({ fix: { lat: 0.05, lng: 0, t: NOW }, fixAt: NOW - 1000 });
    const w = buildHomeWorld(NOW);
    expect(w.lastRide).toBeUndefined();
    expect(w.usualStartMins).toEqual([]);
    expect(decideHomeOffer({ ...w, sunsetMs: undefined })).toBeNull();
  });
  it('learns usual start minutes from three rides at about the same time', () => {
    const at = (d: number) => new Date(2026, 10, 12 - d, 8, 10).getTime();
    rides.setState({ rides: [1, 2, 3].map((d) => ({ startedAt: at(d), durationSec: 1800, distanceKm: 10 })) as never });
    expect(buildHomeWorld(NOW).usualStartMins).toEqual([8 * 60 + 10]);
  });
  it('uses the recorder point while a ride runs, else a fresh fix, and never acquires', () => {
    places.setState({ home: { lat: 0, lng: 0, label: 'H', setAt: 1 } });
    loc.setState({ fix: { lat: 5, lng: 5, t: NOW }, fixAt: NOW - 1000 });
    expect(buildHomeWorld(NOW)).toMatchObject({ pos: { lat: 5, lng: 5 }, posAt: NOW - 1000, rideRunning: false });
    rec.setState({ status: 'running', points: [{ lat: 7, lng: 8 }], lastFixAt: NOW - 500 });
    expect(buildHomeWorld(NOW)).toMatchObject({ pos: { lat: 7, lng: 8 }, rideRunning: true });
    expect(acquire).not.toHaveBeenCalled();
  });
  it('flags a group ride, a trip today and the dismissals', () => {
    companion.setState({ group: { id: 'g' } as never });
    trips.setState({ trips: [{ startDate: '2026-11-12', days: [{}] }] as never });
    offer.setState({ dismissals: [4] });
    expect(buildHomeWorld(NOW)).toMatchObject({ inGroupRide: true, tripActive: true, dismissals: [4] });
  });
  it('needsQuickReading is false with a recording point or a fresh fix, true otherwise', () => {
    rec.setState({ status: 'running', points: [{ lat: 1, lng: 1 }], lastFixAt: NOW });
    expect(needsQuickReading(NOW)).toBe(false);
    rec.setState({ status: 'running', points: [], lastFixAt: 0 });
    expect(needsQuickReading(NOW)).toBe(true);
    rec.setState({ status: 'idle', points: [] });
    loc.setState({ fix: { lat: 1, lng: 1, t: NOW }, fixAt: NOW - 60_000 });
    expect(needsQuickReading(NOW)).toBe(false);
    loc.setState({ fixAt: NOW - 200_000 });
    expect(needsQuickReading(NOW)).toBe(true);
  });
});
