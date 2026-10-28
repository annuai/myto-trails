import { describe, expect, it } from 'vitest';
import type { LatLng } from './geo';
import { buildSharedRoute, sharedIdOf, MAX_SHARED_POINTS } from './shareRoute';

// About 11 km north along longitude 77, a point every ~11 m.
const long: LatLng[] = Array.from({ length: 1000 }, (_, i) => ({ lat: 12 + i * 0.0001, lng: 77 + (i % 2) * 0.00001 }));

describe('buildSharedRoute', () => {
  it('trims both ends, rounds to five decimals and reports the distance of what is shared', () => {
    const r = buildSharedRoute({ name: 'Morning ride', points: long })!;
    expect(r.points[0][0]).toBeGreaterThan(12.0025);
    expect(r.points[r.points.length - 1][0]).toBeLessThan(12.0997);
    for (const [lat, lng] of r.points) { expect(lat).toBe(Math.round(lat * 1e5) / 1e5); expect(lng).toBe(Math.round(lng * 1e5) / 1e5); }
    expect(r.distanceKm).toBeGreaterThan(10);
    expect(r.distanceKm).toBeLessThan(10.8);
  });
  it('caps the points at 2000', () => {
    const wiggle: LatLng[] = Array.from({ length: 9000 }, (_, i) => ({ lat: 12 + i * 0.0001, lng: 77 + Math.sin(i / 7) * 0.01 }));
    expect(buildSharedRoute({ name: 'Long', points: wiggle })!.points.length).toBeLessThanOrEqual(MAX_SHARED_POINTS);
  });
  it('is null for a ride too short to share', () => {
    expect(buildSharedRoute({ name: 'Round the block', points: long.slice(0, 40) })).toBeNull();
  });
  it('drops waypoints near the start or end and keeps the rest', () => {
    const r = buildSharedRoute({ name: 'W', points: long, waypoints: [{ name: 'Home gate', lat: 12.0005, lng: 77 }, { name: 'Tea', lat: 12.05, lng: 77 }] })!;
    expect(r.waypoints).toEqual([{ name: 'Tea', lat: 12.05, lng: 77 }]);
  });
  it('omits the waypoints key when none are left, and takes web addresses out of names', () => {
    const r = buildSharedRoute({ name: 'See https://spam.example now', points: long, waypoints: [{ name: 'Home', lat: 12.0001, lng: 77 }] })!;
    expect(r).not.toHaveProperty('waypoints');
    expect(r.name).toBe('See now');
  });
  it('works out the climb from the shared part when the points have heights, else uses the one given', () => {
    const withEle = long.map((p, i) => ({ ...p, ele: 100 + i }));
    expect(buildSharedRoute({ name: 'Hill', points: withEle })!.elevationGainM).toBeGreaterThan(900);
    expect(buildSharedRoute({ name: 'Flat', points: long, elevationGainM: 40 })!.elevationGainM).toBe(40);
    expect(buildSharedRoute({ name: 'None', points: long })).not.toHaveProperty('elevationGainM');
  });

  it('reads the id out of a share link, whatever follows it', () => {
    expect(sharedIdOf('https://site.test/route/abc23xyz45')).toBe('abc23xyz45');
    expect(sharedIdOf('https://site.test/route/abc23xyz45/?utm=1#top')).toBe('abc23xyz45');
  });
});
