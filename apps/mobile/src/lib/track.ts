import { haversine, type LatLng } from './geo';

const MAX_ACCURACY_M = 100;
const MAX_KMH = 250;
const JITTER_M = 3;
const GAP_SEC = 60;
const GAP_M = 150;
const MOVING_KMH = 1;
const RESYNC_AFTER = 3;

const seconds = (a: LatLng, b: LatLng) => (a.t != null && b.t != null ? (b.t - a.t) / 1000 : 0);

/**
 * Turn raw fixes into a clean track. Runs when a ride is finished or drawn, never while recording, so the raw
 * fixes are kept until then. Drops poor-accuracy fixes, impossible jumps and standing-still jitter. A bad first
 * fix cannot erase the ride: after three jumps in a row near the start, the later fixes are taken as the truth.
 */
export function cleanTrack(points: LatLng[]): LatLng[] {
  let out: LatLng[] = [];
  let rejected: LatLng[] = [];
  for (const p of points) {
    if (p.acc != null && p.acc > MAX_ACCURACY_M) continue;
    const last = out[out.length - 1];
    if (!last) { out.push(p); continue; }
    const step = haversine(last, p);
    const dt = seconds(last, p);
    if (dt > 0 && (step / dt) * 3.6 > MAX_KMH) {
      rejected.push(p);
      if (rejected.length >= RESYNC_AFTER && out.length <= RESYNC_AFTER) { out = rejected; rejected = []; }
      continue;
    }
    rejected = [];
    if (step >= JITTER_M) out.push(p);
  }
  return out;
}

/**
 * Split at real GPS gaps: more than 60 s and more than 150 m since the last fix. A long stop in one place
 * (a tea break) has no distance, so it stays one segment.
 */
export function splitSegments(points: LatLng[]): LatLng[][] {
  const segments: LatLng[][] = [];
  for (const p of points) {
    const seg = segments[segments.length - 1];
    const last = seg?.[seg.length - 1];
    if (!seg || !last || !(seconds(last, p) > GAP_SEC && haversine(last, p) > GAP_M)) {
      if (seg) seg.push(p); else segments.push([p]);
    } else segments.push([p]);
  }
  return segments;
}

/** Distance and moving time from the real segments only; the straight line across a break is reported as `gapM`. */
export function trackStats(segments: LatLng[][]): { distanceM: number; movingSec: number; gapM: number; maxKmh: number } {
  let distanceM = 0, movingSec = 0, gapM = 0, maxKmh = 0;
  segments.forEach((seg, s) => {
    for (let i = 1; i < seg.length; i++) {
      const step = haversine(seg[i - 1], seg[i]);
      const dt = seconds(seg[i - 1], seg[i]);
      distanceM += step;
      if (dt > 0) {
        const kmh = (step / dt) * 3.6;
        if (kmh > MOVING_KMH) movingSec += dt;
        maxKmh = Math.max(maxKmh, kmh);
      }
    }
    const prev = segments[s - 1];
    if (prev?.length && seg.length) gapM += haversine(prev[prev.length - 1], seg[0]);
  });
  return { distanceM, movingSec, gapM, maxKmh };
}

/** Rebuild segments from a flat track and the indices where each new segment starts (absent on rides saved before gaps were tracked). */
export function segmentsOf(points: LatLng[], breaks: number[] = []): LatLng[][] {
  if (!points.length) return [];
  const starts = [0, ...breaks.filter((b) => b > 0 && b < points.length)];
  return starts.map((s, i) => points.slice(s, starts[i + 1]));
}

/** The inverse of `segmentsOf`: the index in the flat track where each segment after the first starts. */
export function breaksOf(segments: LatLng[][]): number[] {
  let at = 0;
  return segments.slice(0, -1).map((s) => (at += s.length));
}
