import { pathLength, type LatLng } from './geo';

/** Average speed used for a rough estimate on mixed roads and trails. */
export const PLAN_KMH = 35;

export type PlannedRoute = { points: LatLng[]; distanceKm: number; etaMin: number };

/** A route from the points a rider tapped on the map, joined by straight lines. The estimate is rough on purpose. */
export function planRoute(tapped: LatLng[], kmh: number = PLAN_KMH): PlannedRoute {
  const distanceKm = pathLength(tapped) / 1000;
  return { points: tapped, distanceKm, etaMin: Math.round((distanceKm / kmh) * 60) };
}

/** Douglas-Peucker: drops points that lie within `toleranceM` of the line between the points kept. The ends are always kept. */
export function simplify(points: LatLng[], toleranceM: number): LatLng[] {
  if (points.length < 3) return points;
  const lat0 = points[0].lat * (Math.PI / 180);
  const kx = 111_320 * Math.cos(lat0), ky = 110_540;
  const xy = points.map((p) => [p.lng * kx, p.lat * ky] as const);
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = xy[a], [bx, by] = xy[b];
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    let far = -1, farD = toleranceM;
    for (let i = a + 1; i < b; i++) {
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((xy[i][0] - ax) * dx + (xy[i][1] - ay) * dy) / len2));
      const d = Math.hypot(xy[i][0] - (ax + t * dx), xy[i][1] - (ay + t * dy));
      if (d > farD) { far = i; farD = d; }
    }
    if (far >= 0) { keep[far] = true; stack.push([a, far], [far, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

/** For each point, how far it was from the line when Douglas-Peucker split there: big means it shapes the route. The ends rank highest. */
function importance(points: LatLng[]): number[] {
  const n = points.length;
  const rank = new Array<number>(n).fill(0);
  rank[0] = rank[n - 1] = Infinity;
  const lat0 = points[0].lat * (Math.PI / 180);
  const kx = 111_320 * Math.cos(lat0), ky = 110_540;
  const xy = points.map((p) => [p.lng * kx, p.lat * ky] as const);
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = xy[a], [bx, by] = xy[b];
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    let far = -1, farD = -1;
    for (let i = a + 1; i < b; i++) {
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((xy[i][0] - ax) * dx + (xy[i][1] - ay) * dy) / len2));
      const d = Math.hypot(xy[i][0] - (ax + t * dx), xy[i][1] - (ay + t * dy));
      if (d > farD) { far = i; farD = d; }
    }
    if (far >= 0) { rank[far] = farD; stack.push([a, far], [far, b]); }
  }
  return rank;
}

/**
 * At most `max` points that keep the route's shape: the points that stood furthest from the straight line when it was split.
 * One pass over the track however long it is, so sharing a ride of tens of thousands of points does not stall the phone.
 */
export function simplifyTo(points: LatLng[], max: number): LatLng[] {
  if (points.length <= max) return points;
  const rank = importance(points);
  const keep = new Set([...rank.keys()].sort((a, b) => rank[b] - rank[a]).slice(0, Math.max(2, max)));
  return points.filter((_, i) => keep.has(i));
}
