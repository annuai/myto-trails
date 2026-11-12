import type { LatLng } from './geo';
import { segmentsOf } from './track';

/** A cell is about 100 m on a side (0.001 degree of latitude); a road ridden before is a road whose cells were touched. */
const CELL_DEG = 0.001;
const cell = (p: LatLng) => `${Math.round(p.lat / CELL_DEG)},${Math.round(p.lng / CELL_DEG)}`;

/** The cells a ride passed through. Gaps between fixes (fast riding, a weak signal) are filled in, but never across a GPS break. */
export function cellsOf(points: LatLng[], breaks: number[] = []): Set<string> {
  const out = new Set<string>();
  for (const seg of segmentsOf(points, breaks)) {
    seg.forEach((p, i) => {
      out.add(cell(p));
      const q = seg[i - 1];
      if (!q) return;
      const steps = Math.ceil(Math.max(Math.abs(p.lat - q.lat), Math.abs(p.lng - q.lng)) / CELL_DEG);
      for (let k = 1; k < steps; k++) out.add(cell({ lat: q.lat + ((p.lat - q.lat) * k) / steps, lng: q.lng + ((p.lng - q.lng) * k) / steps }));
    });
  }
  return out;
}

type R = { id: string; startedAt: number; sample?: boolean; distanceKm: number; points: LatLng[]; breaks?: number[] };

/**
 * How much of a ride was on ground the rider had not ridden before: the share of its cells that no earlier ride touched, and that share of its
 * distance. Undefined for a rider's first ride (all of it is new, which says nothing), a sample ride, or a ride with no track.
 */
export function newGround(ride: R, all: R[]): { share: number; km: number } | undefined {
  if (ride.sample || ride.points.length < 2) return undefined;
  const earlier = all.filter((r) => !r.sample && r.id !== ride.id && r.startedAt < ride.startedAt && r.points.length >= 2);
  if (!earlier.length) return undefined;
  const seen = new Set<string>();
  for (const r of earlier) for (const c of cellsOf(r.points, r.breaks)) seen.add(c);
  const mine = cellsOf(ride.points, ride.breaks);
  if (!mine.size) return undefined;
  let fresh = 0;
  for (const c of mine) if (!seen.has(c)) fresh++;
  const share = fresh / mine.size;
  return { share, km: share * ride.distanceKm };
}
