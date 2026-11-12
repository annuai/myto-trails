import { describe, expect, it, vi } from 'vitest';
import { haversine, type LatLng } from './geo';
import { buildSharedRoute, sharedIdOf, MAX_SHARED_POINTS } from './shareRoute';
import { canExportGpx, forSubmission, gpxForExport, placesOf, trimEnds } from './privacy';
import { buildRideCard } from './rideCard';
import { traceFor } from './osm';

// The OpenStreetMap upload, wired to stores that hold one ride starting at Home.
const osm = vi.hoisted(() => { process.env.EXPO_PUBLIC_OSM_CLIENT_ID = 'test'; return { uploads: [] as string[] }; });
const mk = vi.hoisted(() => async <T extends object>(init: T) => (await import('zustand')).create<T>(() => init));
vi.mock('./osmApi', () => ({ hasOsmToken: async () => true, uploadTrace: async (gpx: string) => { osm.uploads.push(gpx); return 'sent'; } }));
vi.mock('@/store/osm', async () => ({
  sharingOn: () => true,
  useOsm: await mk({ connected: true, pending: ['home-ride'], setConnected: () => undefined, settle: () => undefined, queue: () => undefined }),
}));
vi.mock('@/store/rides', async () => ({ useRides: await mk({ rides: [{ id: 'home-ride', distanceKm: 11, points: Array.from({ length: 1000 }, (_, i) => ({ lat: 12 + i * 0.0001, lng: 77 })) }] }) }));
vi.mock('@/store/places', async () => ({ usePlaces: await mk({ home: { lat: 12, lng: 77, label: 'Home', setAt: 1 }, work: undefined, endStrikes: { home: 0, work: 0 } }) }));

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

describe('Home and Work stay out of anything that leaves the phone', () => {
  const home = { lat: 12, lng: 77 };
  const places = [home];
  /** The first track point of a GPX text. */
  const firstTrkpt = (gpx: string): LatLng => { const m = /<trkpt lat="([\d.-]+)" lon="([\d.-]+)"/.exec(gpx)!; return { lat: +m[1]!, lng: +m[2]! }; };
  /** Back and forth within 450 m of Home: over 2 km of riding, none of it far enough away to share. */
  const pottering: LatLng[] = Array.from({ length: 400 }, (_, i) => ({ lat: 12 + (i % 40 < 20 ? i % 20 : 20 - (i % 20)) * 0.0002, lng: 77 }));

  it('the saved places are Home and Work, whichever are set', () => {
    const saved = { lat: 1, lng: 2, label: 'H', setAt: 1 };
    expect(placesOf({ home: saved })).toEqual([{ lat: 1, lng: 2 }]);
    expect(placesOf({})).toEqual([]);
  });
  it('a route link starts more than 500 m from Home and drops waypoints near it', () => {
    const r = buildSharedRoute({ name: 'From home', points: long, places, waypoints: [{ name: 'Corner shop', lat: 12.004, lng: 77 }, { name: 'Tea', lat: 12.05, lng: 77 }] })!;
    expect(haversine({ lat: r.points[0]![0], lng: r.points[0]![1] }, home)).toBeGreaterThan(500);
    expect(r.waypoints).toEqual([{ name: 'Tea', lat: 12.05, lng: 77 }]);
  });
  it('a route link of a ride that never got 500 m from Home is nothing to share', () => {
    expect(buildSharedRoute({ name: 'Pottering', points: pottering, places })).toBeNull();
  });
  it('a ride card starts more than 500 m from Home, even showing the whole route', () => {
    const ride = { name: 'R', startedAt: 1, distanceKm: 11, durationSec: 1, maxKmh: 1, waypoints: 0, points: long };
    expect(haversine(buildRideCard(ride, { places }).geoRoute![0]!, home)).toBeGreaterThan(500);
    expect(haversine(buildRideCard(ride, { places, fullRoute: true }).geoRoute![0]!, home)).toBeGreaterThan(500);
    const near = buildRideCard({ ...ride, points: pottering }, { places, fullRoute: true });
    expect(near.route).toBeNull();
    expect(near.geoRoute).toBeNull();
  });
  it('an OpenStreetMap trace starts more than 500 m from Home, and is not sent when nothing is left', () => {
    expect(haversine(firstTrkpt(traceFor({ id: 'a', distanceKm: 11, points: long }, places)!.gpx), home)).toBeGreaterThan(500);
    expect(traceFor({ id: 'a', distanceKm: 2, points: pottering }, places)).toBeUndefined();
  });
  it('the OpenStreetMap upload trims with the saved Home', async () => {
    const { shareQueued } = await import('./osmShare');
    await shareQueued();
    expect(osm.uploads).toHaveLength(1);
    expect(haversine(firstTrkpt(osm.uploads[0]!), home)).toBeGreaterThan(500);
  });
  it('a trail submission starts more than 500 m from Home on top of the rider\'s own trim', () => {
    expect(haversine(forSubmission(long, 200, places)[0]!, home)).toBeGreaterThan(500);
    expect(forSubmission(long, 200, [])).toEqual(trimEnds(long, 200));
    expect(forSubmission(pottering, 0, places)).toEqual([]);
  });
  it('an exported GPX file starts more than 500 m from Home, keeps its breaks in step, and is null when nothing is left', () => {
    const gpx = gpxForExport('R', long, places, [{ name: 'Home gate', lat: 12.001, lng: 77 }, { name: 'Tea', lat: 12.05, lng: 77 }], [10, 600])!;
    expect(haversine(firstTrkpt(gpx), home)).toBeGreaterThan(500);
    expect(gpx).not.toContain('Home gate');
    expect(gpx).toContain('Tea');
    expect(gpx.match(/<trkseg>/g)).toHaveLength(2);
    expect(gpxForExport('R', pottering, places)).toBeNull();
    expect(gpxForExport('R', long, [])).toContain('lat="12.000000"');
  });
  it('whether a GPX file can be exported matches whether one is built', () => {
    const twoLeft: LatLng[] = [home, { lat: 12.01, lng: 77 }, { lat: 12.02, lng: 77 }];
    const oneLeft: LatLng[] = [home, { lat: 12.001, lng: 77 }, { lat: 12.01, lng: 77 }];
    for (const pts of [long, pottering, twoLeft, oneLeft]) expect(canExportGpx(pts, places, [5])).toBe(gpxForExport('R', pts, places, [], [5]) !== null);
    expect(canExportGpx(long, places)).toBe(true);
    expect(canExportGpx(pottering, places)).toBe(false);
    expect(canExportGpx(oneLeft, places)).toBe(false);
  });
});
