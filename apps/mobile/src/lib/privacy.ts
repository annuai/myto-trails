import { haversine, nearPlacesRange, trimEnds, trimNearPlaces, type LatLng } from './geo';
import { buildGpx } from './gpx';

export { trimEnds };

/** How much of each end of a ride is left out of anything shared (a card, a route link): enough to hide a home or workplace. */
export const SHARE_TRIM_M = 300;
/** Points this close to the rider's saved Home or Work, at the start or end of a route, never leave the phone. */
export const PLACE_TRIM_M = 500;

/** Home and Work as plain points, whichever are set. They stay on the phone; this is only for trimming. */
export const placesOf = (s: { home?: { lat: number; lng: number }; work?: { lat: number; lng: number } }): LatLng[] => [s.home, s.work].flatMap((p) => (p ? [{ lat: p.lat, lng: p.lng }] : []));

/** A track as it may be shown to other people. Empty when the ride is too short to share without giving away where it began. */
export const forSharing = (points: LatLng[], places: LatLng[] = []): LatLng[] => trimNearPlaces(trimEnds(points, SHARE_TRIM_M), places, PLACE_TRIM_M);

/** A track sent for review as a trail: the rider's own trim of each end, then anything near Home or Work at either end. */
export const forSubmission = (points: LatLng[], trim: number, places: LatLng[] = []): LatLng[] => trimNearPlaces(trimEnds(points, trim), places, PLACE_TRIM_M);

/** Waypoints, or any points, that are not within 500 m of Home or Work. */
export const awayFromPlaces = <T extends { lat: number; lng: number }>(items: T[], places: LatLng[]): T[] =>
  places.length ? items.filter((w) => places.every((p) => haversine(p, w) > PLACE_TRIM_M)) : items;

/** `trimNearPlaces` for a track split into segments: the break indices are moved to match the points that are left. */
export function trimNearPlacesWithBreaks(points: LatLng[], breaks: number[] | undefined, places: LatLng[]): { points: LatLng[]; breaks: number[] | undefined } {
  if (!places.length) return { points, breaks };
  const [from, to] = nearPlacesRange(points, places, PLACE_TRIM_M);
  return { points: points.slice(from, to), breaks: breaks?.filter((b) => b > from && b < to).map((b) => b - from) };
}

/** A GPX file of a ride or route for the share sheet, without its ends near Home or Work. Null when nothing is left to export. */
export function gpxForExport(name: string, points: LatLng[], places: LatLng[], waypoints: { name: string; lat: number; lng: number; kind?: string }[] = [], breaks?: number[]): string | null {
  const t = trimNearPlacesWithBreaks(points, breaks, places);
  if (t.points.length < 2) return null;
  return buildGpx(name, t.points, awayFromPlaces(waypoints, places), t.breaks);
}
