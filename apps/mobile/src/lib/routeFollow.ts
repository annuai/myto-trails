import type { LatLng } from './geo';

const R = 6_371_000;
const RAD = Math.PI / 180;

/** Metres a rider may be from the planned line before it counts as leaving it, and how close they must come back. */
export const OFF_ROUTE_M = 100;
export const BACK_ON_ROUTE_M = 60;
/** How long they must stay away first, so a wide bend or a GPS blip does not raise an alert. */
export const OFF_ROUTE_AFTER_MS = 20_000;

export type RoutePosition = { distM: number; /** Index of the segment's first point. */ segment: number; /** Metres from the start of the line to the nearest point on it. */ alongM: number };

/** The nearest point on a line to `p`: how far away it is and how far along the line it lies. Null for a line with no points. */
export function nearestOnLine(line: LatLng[], p: LatLng): RoutePosition | null {
  if (!line.length) return null;
  if (line.length === 1) return { distM: dist(line[0], p), segment: 0, alongM: 0 };
  // Flat-earth metres around `p` are accurate to well under a metre for the distances a route needs.
  const kx = R * RAD * Math.cos(p.lat * RAD), ky = R * RAD;
  const xy = (q: LatLng) => [(q.lng - p.lng) * kx, (q.lat - p.lat) * ky] as const;
  let best: RoutePosition = { distM: Infinity, segment: 0, alongM: 0 };
  let before = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = xy(line[i]), [bx, by] = xy(line[i + 1]);
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    const seg = Math.sqrt(len2);
    if (d < best.distM) best = { distM: d, segment: i, alongM: before + t * seg };
    before += seg;
  }
  return best;
}

/** Metres from `p` to the line (Infinity for an empty line). */
export const distanceToLine = (line: LatLng[], p: LatLng): number => nearestOnLine(line, p)?.distM ?? Infinity;

function dist(a: LatLng, b: LatLng) {
  const dLat = (b.lat - a.lat) * RAD, dLng = (b.lng - a.lng) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type FollowState = { off: boolean; /** When the rider first went beyond the limit, while they are still within the wait. */ farSince: number | null };
export const startFollow: FollowState = { off: false, farSince: null };

/** One step of the monitor: off the line after more than 100 m for 20 s, back on it within 60 m. The ends of an alert are reported once. */
export function stepFollow(s: FollowState, distM: number, now: number): { state: FollowState; wentOff: boolean; backOn: boolean } {
  if (s.off) {
    return distM <= BACK_ON_ROUTE_M ? { state: startFollow, wentOff: false, backOn: true } : { state: s, wentOff: false, backOn: false };
  }
  if (distM <= OFF_ROUTE_M) return { state: s.farSince === null ? s : startFollow, wentOff: false, backOn: false };
  const farSince = s.farSince ?? now;
  if (now - farSince >= OFF_ROUTE_AFTER_MS) return { state: { off: true, farSince: null }, wentOff: true, backOn: false };
  return { state: { off: false, farSince }, wentOff: false, backOn: false };
}
