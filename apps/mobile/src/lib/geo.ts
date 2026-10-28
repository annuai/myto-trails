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

/**
 * Drop the first and last `meters` of a track, so a home or workplace is not published (docs/14 §4). The track is cut exactly
 * there, with a new point on the line, so a route of only a few far-apart points (one built by tapping the map) is trimmed too.
 */
export function trimEnds(points: LatLng[], meters: number): LatLng[] {
  if (meters <= 0) return points;
  if (points.length < 2) return [];
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + haversine(points[i - 1], points[i]));
  const total = cum[cum.length - 1];
  if (total <= meters * 2) return [];
  /** The point `d` metres along the track, on the straight line between the two points either side of it. */
  const at = (d: number): LatLng => {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const span = cum[i] - cum[i - 1] || 1;
    const t = (d - cum[i - 1]) / span;
    const a = points[i - 1], b = points[i];
    return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
  };
  return [at(meters), ...points.filter((_, i) => cum[i] > meters && cum[i] < total - meters), at(total - meters)];
}
