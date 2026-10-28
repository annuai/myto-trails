import { describe, expect, it } from 'vitest';
import type { LatLng } from './geo';
import { buildRide } from './buildRide';

const M = 1 / 111_320;
const T0 = new Date(2026, 9, 28, 9, 0, 0).getTime();
const pt = (north: number, tSec: number, acc?: number): LatLng => ({ lat: 13 + north * M, lng: 77.6, t: T0 + tSec * 1000, ...(acc !== undefined ? { acc } : {}) });
const raw = (points: LatLng[]) => ({ meta: { startedAt: T0, source: 'gps' as const }, points, waypoints: [{ name: 'Waypoint 1', lat: 13, lng: 77.6 }] });

describe('buildRide', () => {
  it('saves nothing for no points or a single point', () => {
    expect(buildRide(raw([]), T0)).toBeUndefined();
    expect(buildRide(raw([pt(0, 0)]), T0)).toBeUndefined();
  });
  it('keeps cleaned points, the waypoints, a name from the start time and the duration from the fixes', () => {
    const ride = buildRide(raw([pt(0, 0), pt(500, 30, 400), pt(1000, 60), pt(2000, 100)]), T0 + 300_000)!;
    expect(ride.points).toHaveLength(3);
    expect(ride.waypoints).toHaveLength(1);
    expect(ride.name).toBe('28 Oct morning ride');
    expect(ride.durationSec).toBe(100);
    expect(ride.distanceKm).toBe(2);
    expect(ride.breaks).toEqual([]);
  });
  it('records where a GPS gap splits the ride, and does not count the gap as distance', () => {
    const ride = buildRide(raw([pt(0, 0), pt(100, 10), pt(3100, 200), pt(3200, 210)]), T0 + 300_000)!;
    expect(ride.breaks).toEqual([2]);
    expect(ride.distanceKm).toBe(0.2);
  });
  it('never gives a negative duration when the phone clock went backwards', () => {
    const ride = buildRide(raw([pt(0, 0), pt(100, -50)]), T0)!;
    expect(ride.durationSec).toBeGreaterThanOrEqual(0);
  });
});
