import type { LatLng } from './geo';
import { asText, distanceKm } from './units';

/** Within this of a trail's start counts as being at it. A phone's GPS is good to about 30 m, and a trailhead is a car park, not a point. */
export const START_RADIUS_M = 150;

type Located = { location?: { lat: number; lon: number } | null; lat?: number; lon?: number };

/** Where a trail begins, from its detail, or undefined when it publishes no start. */
export function trailStartPoint(d: Located): LatLng | undefined {
  const p = d.location ?? (Number.isFinite(d.lat) && Number.isFinite(d.lon) ? { lat: d.lat as number, lon: d.lon as number } : undefined);
  return p ? { lat: p.lat, lng: p.lon } : undefined;
}

export const atTrailStart = (metres: number | undefined): boolean => metres !== undefined && metres <= START_RADIUS_M;

/** "850 m" under a kilometre, otherwise in the rider's unit. */
export const distanceAway = (metres: number): string => (metres < 1000 ? `${Math.round(metres / 10) * 10} m` : asText(distanceKm(metres / 1000)));
