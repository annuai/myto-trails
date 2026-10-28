export type LatLng = { lat: number; lng: number; t?: number; ele?: number; /** Horizontal accuracy in metres, when the phone reports it. */ acc?: number; speed?: number | null };

export function haversine(a: LatLng, b: LatLng): number {
  const R = 6_371_000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function pathLength(points: LatLng[]): number {
  let m = 0;
  for (let i = 1; i < points.length; i++) m += haversine(points[i - 1], points[i]);
  return m;
}

/** Drop the first and last `meters` of a track, so a home or workplace is not published (docs/14 §4). */
export function trimEnds(points: LatLng[], meters: number): LatLng[] {
  if (meters <= 0 || points.length < 3) return points;
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + haversine(points[i - 1], points[i]));
  const total = cum[cum.length - 1];
  if (total <= meters * 2) return [];
  return points.filter((_, i) => cum[i] >= meters && cum[i] <= total - meters);
}
