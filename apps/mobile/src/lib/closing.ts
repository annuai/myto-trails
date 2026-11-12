import { haversine, type LatLng } from './geo';

/** A ride's track made ready to be inked onto the map: thinned, with the distance along it, so a frame is a cheap slice. */
export type Closing = {
  points: LatLng[];
  /** Where each GPS segment after the first starts, as indexes into `points`. */
  breaks: number[];
  /** Metres along the track at each point. A GPS gap adds nothing, so the ink never spends time crossing one. */
  along: number[];
  totalM: number;
  /** Metres along the track at which each waypoint is passed, in the order given. */
  waypointAt: number[];
};

/** About this many points are enough to draw a ride on a phone map; more only costs time on every frame. */
export const CLOSING_MAX_POINTS = 250;

/** Thins the track to about `max` points, always keeping the first, the last, and both sides of every GPS gap. */
export function prepareClosing(points: LatLng[], breaks: number[] = [], waypoints: LatLng[] = [], max = CLOSING_MAX_POINTS): Closing {
  const n = points.length;
  const stride = Math.max(1, Math.ceil(n / max));
  const keep = new Set<number>();
  for (let i = 0; i < n; i += stride) keep.add(i);
  if (n) keep.add(n - 1);
  for (const b of breaks) { if (b > 0 && b < n) { keep.add(b); keep.add(b - 1); } }
  const idx = [...keep].sort((a, b) => a - b);
  const pts = idx.map((i) => points[i]!);
  const where = new Map(idx.map((original, k) => [original, k]));
  const brk = breaks.filter((b) => where.has(b)).map((b) => where.get(b)!);
  const starts = new Set(brk);
  const along: number[] = [];
  let total = 0;
  pts.forEach((p, k) => {
    if (k > 0 && !starts.has(k)) total += haversine(pts[k - 1]!, p);
    along.push(total);
  });
  const waypointAt = waypoints.map((w) => {
    let best = 0, bestD = Infinity;
    pts.forEach((p, k) => { const d = haversine(p, w); if (d < bestD) { bestD = d; best = k; } });
    return along[best] ?? 0;
  });
  return { points: pts, breaks: brk, along, totalM: total, waypointAt };
}

export type ClosingFrame = {
  /** The inked part of the track so far, ending at the head. */
  track: LatLng[];
  breaks: number[];
  /** The head of the ink: undefined at the very start and once the ink is complete. */
  head?: LatLng;
  /** Indexes (into the waypoints given to `prepareClosing`) of the waypoints the ink has passed. */
  passed: number[];
};

/** The ink at `fraction` (0 to 1) of the way along the track. */
export function closingAt(c: Closing, fraction: number): ClosingFrame {
  const n = c.points.length;
  const f = Math.min(1, Math.max(0, fraction));
  if (f >= 1 || n < 2 || c.totalM === 0) return { track: c.points, breaks: c.breaks, passed: c.waypointAt.map((_, i) => i) };
  const target = f * c.totalM;
  let k = 0;
  while (k + 1 < n && c.along[k + 1]! <= target) k++;
  const track = c.points.slice(0, k + 1);
  const brk = c.breaks.filter((b) => b <= k);
  const next = c.points[k + 1];
  let head: LatLng | undefined = c.points[k];
  if (next && !c.breaks.includes(k + 1)) {
    const span = c.along[k + 1]! - c.along[k]!;
    const t = span > 0 ? (target - c.along[k]!) / span : 0;
    const a = c.points[k]!;
    head = { lat: a.lat + (next.lat - a.lat) * t, lng: a.lng + (next.lng - a.lng) * t };
    track.push(head);
  }
  const passed = c.waypointAt.flatMap((d, i) => (d <= target ? [i] : []));
  return { track, breaks: brk, head: f > 0 ? head : undefined, passed };
}
