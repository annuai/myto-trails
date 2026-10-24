export type LatLon = { lat: number; lon: number };

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rough travel time from straight-line distance. Always an estimate; ghat and forest roads are slower. */
export function estimateTravel(
  straightKm: number,
  opts: { roadFactor?: number; speedKmh?: number } = {},
): { oneWayMin: number; roundTripMin: number } {
  if (!Number.isFinite(straightKm) || straightKm < 0) throw new RangeError("straightKm must be a finite, non-negative number");
  const roadFactor = opts.roadFactor ?? 1.4;
  const speedKmh = opts.speedKmh ?? 40;
  const oneWayMin = Math.round(((straightKm * roadFactor) / speedKmh) * 60 / 5) * 5;
  return { oneWayMin, roundTripMin: oneWayMin * 2 };
}
