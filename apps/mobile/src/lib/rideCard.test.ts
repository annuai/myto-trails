import { describe, expect, it } from 'vitest';
import type { LatLng } from './geo';
import { buildRideCard, CARD_SIZE, normaliseRoute, type CardRide } from './rideCard';

const track: LatLng[] = Array.from({ length: 300 }, (_, i) => ({ lat: 12 + i * 0.0002, lng: 77 + Math.sin(i / 30) * 0.004 }));
const ride: CardRide = { name: 'Nandi Hills sunrise', startedAt: Date.UTC(2026, 9, 28, 1, 0), distanceKm: 61.4, durationSec: 5400, maxKmh: 88.6, waypoints: 3, points: track, elevationGainM: 640 };

describe('buildRideCard', () => {
  it('has the three sizes', () => {
    expect(CARD_SIZE).toEqual({ story: { width: 1080, height: 1920 }, post: { width: 1080, height: 1350 }, square: { width: 1080, height: 1080 } });
    expect(buildRideCard(ride, { format: 'post' })).toMatchObject({ format: 'post', width: 1080, height: 1350 });
    expect(buildRideCard(ride)).toMatchObject({ format: 'story', width: 1080, height: 1920 });
  });
  it('shows distance, time and top speed by default, in the app units', () => {
    const c = buildRideCard(ride);
    expect(c.stats.map((s) => s.key)).toEqual(['distance', 'time', 'topSpeed']);
    expect(c.stats[0].parts).toEqual([{ value: '61.4', unit: 'km' }]);
    expect(c.stats[1].parts).toEqual([{ value: '1', unit: 'h' }, { value: '30', unit: 'min' }]);
    expect(c.stats[2].parts).toEqual([{ value: '89', unit: 'km/h' }]);
  });
  it('shows the stats asked for, once each and at most four, skipping climb when unknown', () => {
    const c = buildRideCard(ride, { stats: ['distance', 'distance', 'elevation', 'waypoints', 'time', 'topSpeed'] });
    expect(c.stats.map((s) => s.key)).toEqual(['distance', 'elevation', 'waypoints', 'time']);
    expect(buildRideCard({ ...ride, elevationGainM: undefined }, { stats: ['elevation', 'distance'] }).stats.map((s) => s.key)).toEqual(['distance']);
  });
  it('puts the trimmed route in a 0..1 box and can hide it', () => {
    const c = buildRideCard(ride);
    expect(c.route!.length).toBeGreaterThan(10);
    expect(c.route!.length).toBeLessThanOrEqual(200);
    for (const p of c.route!) { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(1); expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(1); }
    expect(buildRideCard(ride, { hideRoute: true }).route).toBeNull();
  });
  it('shows no route for a ride too short to share', () => {
    expect(buildRideCard({ ...ride, points: track.slice(0, 20) }).route).toBeNull();
  });
  it('shows the whole route of a short ride only when the rider chooses to', () => {
    const short = { ...ride, points: track.slice(0, 20) };
    const c = buildRideCard(short, { fullRoute: true });
    expect(c.route).not.toBeNull();
    expect(c.geoRoute).toHaveLength(20);
    expect(buildRideCard(short, { fullRoute: true, hideRoute: true }).geoRoute).toBeNull();
  });
  it('gives the map route without the first and last 300 m', () => {
    const c = buildRideCard(ride);
    expect(c.geoRoute![0]).not.toEqual(track[0]);
    expect(c.geoRoute!.length).toBeLessThanOrEqual(200);
  });
});

describe('normaliseRoute', () => {
  it('keeps north at the top and the shape undistorted', () => {
    const { points, aspect } = normaliseRoute([{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }, { lat: 1, lng: 0.5 }]);
    expect(points[0].y).toBe(1);
    expect(points[1].y).toBe(0);
    expect(aspect).toBeCloseTo(0.5, 2);
    // Wider than tall would be centred vertically; this one is taller than wide, so it is centred horizontally.
    expect(points[0].x).toBeCloseTo(0.25, 2);
  });
});
