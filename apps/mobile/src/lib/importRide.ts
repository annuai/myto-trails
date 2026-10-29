import { haversine } from './geo';
import { parseGpx } from './gpxImport';
import { PLAN_KMH } from './routePlan';
import { breaksOf, cleanTrack, splitSegments, trackStats } from './track';
import type { Ride } from '@/store/rides';

/** What parseGpx calls a file that names nothing. */
const UNNAMED_ROUTE = 'Imported route';

/**
 * A GPX file recorded somewhere else, as a ride for the ride log (unlike the route importer, which makes a route to follow).
 * The track is cleaned the way a recorded ride is. When the points carry times the duration and top speed come from them; when
 * they do not, the duration is estimated at an easy riding pace and the name says so. Throws, in plain words, when there is no ride.
 */
export function rideFromGpx(xml: string, now: number, fileName?: string): Omit<Ride, 'id'> {
  const file = parseGpx(xml);
  const points = cleanTrack(file.points);
  if (points.length < 2) throw new Error('This file has no usable track points to make a ride from.');
  const segments = splitSegments(points);
  const stats = trackStats(segments);
  const distanceKm = +(stats.distanceM / 1000).toFixed(1);
  const first = points[0]!.t, last = points[points.length - 1]!.t;
  const timed = first != null && last != null && last > first;
  const named = file.name !== UNNAMED_ROUTE ? file.name : fileName?.replace(/\.gpx$/i, '').trim() || 'Imported ride';
  return {
    name: timed ? named : `${named} (time estimated)`,
    startedAt: timed ? first : now,
    durationSec: timed ? Math.round((last - first) / 1000) : Math.round((distanceKm / PLAN_KMH) * 3600),
    distanceKm,
    maxKmh: timed ? Math.round(stats.maxKmh) : 0,
    points,
    breaks: breaksOf(segments),
    waypoints: file.waypoints,
  };
}

const SAME_START_MS = 60_000;
const SAME_DISTANCE_KM = 0.1;
const SAME_PLACE_M = 25;

/**
 * Whether the log already holds this ride. The same distance and either the same start (within a minute) or the same first and last
 * points (a file with no times has no start), so importing one file twice is caught either way.
 */
export function isDuplicate(existing: Pick<Ride, 'startedAt' | 'distanceKm' | 'points'>[], candidate: Pick<Ride, 'startedAt' | 'distanceKm' | 'points'>): boolean {
  const a = candidate.points[0], b = candidate.points[candidate.points.length - 1];
  return existing.some((r) => {
    if (Math.abs(r.distanceKm - candidate.distanceKm) > SAME_DISTANCE_KM) return false;
    if (Math.abs(r.startedAt - candidate.startedAt) <= SAME_START_MS) return true;
    const c = r.points[0], d = r.points[r.points.length - 1];
    return !!(a && b && c && d && haversine(a, c) <= SAME_PLACE_M && haversine(b, d) <= SAME_PLACE_M);
  });
}
