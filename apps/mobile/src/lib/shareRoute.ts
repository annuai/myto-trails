import { haversine, pathLength, type LatLng } from './geo';
import { elevationProfile } from './elevation';
import { forSharing, SHARE_TRIM_M } from './privacy';
import { simplifyTo } from './routePlan';

export const MAX_SHARED_POINTS = 2000;
export const MAX_SHARED_WAYPOINTS = 50;
const MAX_NAME = 80;

export type SharedRoutePayload = {
  name: string;
  points: [number, number][];
  waypoints?: { name: string; lat: number; lng: number }[];
  distanceKm: number;
  elevationGainM?: number;
};

const r5 = (n: number) => Math.round(n * 1e5) / 1e5;
const noLinks = (s: string) => s.replace(/https?:\/\/\S+|www\.\S+/gi, '').replace(/\s+/g, ' ').trim();

/**
 * The body of `POST /shared-routes`. Both ends are trimmed (a home or workplace is never shared), the track is thinned to
 * at most 2000 points and rounded to five decimals (about a metre), and waypoints near either end are dropped. Null
 * when the route is too short to share without showing where it began.
 */
export function buildSharedRoute(r: { name: string; points: LatLng[]; waypoints?: { name: string; lat: number; lng: number }[]; elevationGainM?: number }): SharedRoutePayload | null {
  const trimmed = forSharing(r.points);
  if (trimmed.length < 2) return null;
  const ends = [r.points[0], r.points[r.points.length - 1]];
  const waypoints = (r.waypoints ?? [])
    .filter((w) => ends.every((e) => haversine(e, w) > SHARE_TRIM_M))
    .slice(0, MAX_SHARED_WAYPOINTS)
    .map((w) => ({ name: noLinks(w.name).slice(0, MAX_NAME) || 'Waypoint', lat: r5(w.lat), lng: r5(w.lng) }));
  const gain = elevationProfile(trimmed)?.gainM ?? r.elevationGainM;
  return {
    name: noLinks(r.name).slice(0, MAX_NAME) || 'Route',
    points: simplifyTo(trimmed, MAX_SHARED_POINTS).map((p) => [r5(p.lat), r5(p.lng)]),
    ...(waypoints.length ? { waypoints } : {}),
    distanceKm: Math.round(pathLength(trimmed) / 100) / 10,
    ...(gain !== undefined ? { elevationGainM: gain } : {}),
  };
}

/** The id in a shared route's link (.../route/<id>), which is what the server deletes it by. */
export const sharedIdOf = (url: string): string => url.split(/[?#]/)[0]!.split('/').filter(Boolean).pop() ?? '';
