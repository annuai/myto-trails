import { segmentsOf } from './track';
import { topSpeedKmh } from './topSpeed';
import type { LatLng } from './geo';

type R = { sample?: boolean; maxKmh: number; points: LatLng[]; breaks?: number[] };

/**
 * Rides saved before the top speed was judged over several steps could carry a GPS glitch as their top speed (162 km/h on a 20 km
 * city ride). This works the top speed out again from the ride's own saved points. The sample ride and rides with no timed points
 * (imported without times, top speed 0) are left alone.
 */
export function withCorrectTopSpeeds<T extends R>(rides: T[]): T[] {
  return rides.map((r) => {
    if (r.sample || !r.points?.length || !r.points.some((p) => p.t != null)) return r;
    const maxKmh = Math.round(topSpeedKmh(segmentsOf(r.points, r.breaks)));
    return maxKmh === r.maxKmh ? r : { ...r, maxKmh };
  });
}
