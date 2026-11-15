import { haversine, type LatLng } from './geo';

/** How far "nearby" reaches. Wide enough for a state and a long day's ride, narrow enough that a French town never outranks an Indian one. */
export const NEARBY_KM = 500;

/** Search either around a centre or anywhere. Nearby is the default; everywhere is the rider's own choice or the fallback. */
export type SearchScope = 'nearby' | 'everywhere';

/** A Photon `bbox` (minLon,minLat,maxLon,maxLat) around `centre`. Longitude is widened with latitude so the box stays about `km` wide; it is clamped to the world. */
export function boxAround(centre: LatLng, km = NEARBY_KM): [number, number, number, number] {
  const dLat = km / 111.32;
  const cos = Math.max(0.01, Math.cos((centre.lat * Math.PI) / 180));
  const dLng = Math.min(180, km / (111.32 * cos));
  return [Math.max(-180, centre.lng - dLng), Math.max(-90, centre.lat - dLat), Math.min(180, centre.lng + dLng), Math.min(90, centre.lat + dLat)];
}

/** Kilometres from `centre` to `p`. */
export const kmFrom = (centre: LatLng, p: LatLng): number => haversine(centre, p) / 1000;

/** Keeps the places within `km` of `centre`. With no centre nothing can be called far, so everything stays. */
export function withinKm<T extends { point: LatLng }>(places: T[], centre: LatLng | undefined, km = NEARBY_KM): T[] {
  return centre ? places.filter((p) => kmFrom(centre, p.point) <= km) : places;
}

/**
 * Where a search is centred: the rider's own choice (the map they are planning on, the last stop), else where the phone is, else Home,
 * else nowhere (then nothing is limited). The first one present wins.
 */
export function searchCentre(...candidates: (LatLng | undefined | null)[]): LatLng | undefined {
  for (const c of candidates) if (c && Number.isFinite(c.lat) && Number.isFinite(c.lng)) return { lat: c.lat, lng: c.lng };
  return undefined;
}
