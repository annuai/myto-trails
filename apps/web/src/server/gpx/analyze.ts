import { createHash } from "node:crypto";
import { haversineKm } from "@moto-trails/domain";
import type { TrackPoint } from "./parse";

export type LatLon = { lat: number; lon: number };

export type TrackAnalysis = {
  pointCount: number;
  distanceKm: number;
  start: LatLon;
  end: LatLon;
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  elevation: { gainM: number; lossM: number; minM: number; maxM: number } | null;
  timing: { movingSeconds: number; stoppedSeconds: number; avgMovingSpeedKmh: number } | null;
  simplified: LatLon[];
  profile: { d: number; e: number }[] | null;
  fingerprint: string;
};

export type AnalyzeError = "no_track_points" | "too_many_points" | "too_few_points" | "invalid_coordinates" | "teleport" | "too_long";
export type AnalyzeResult = { ok: true; analysis: TrackAnalysis } | { ok: false; error: AnalyzeError; message: string };

const MIN_POINTS = 50;
const MIN_LENGTH_KM = 0.5;
const MAX_LENGTH_KM = 500;
const MAX_JUMP_KM = 5;
const MAX_SPEED_KMH = 300;
const ELEVATION_THRESHOLD_M = 3;
const SMOOTH_WINDOW = 5;
const SIMPLIFY_TOLERANCE_M = 5;
const PROFILE_POINTS = 300;
const MAX_POINTS = 100_000;
/** Simplification is quadratic in the worst case, so it runs on an evenly thinned copy of long tracks. */
const SIMPLIFY_INPUT_CAP = 4000;
const MIN_DISTANCE_KM = 0.05;
const ELEVATION_RANGE_M = { min: -500, max: 9000 };

const fail = (error: AnalyzeError, message: string): AnalyzeResult => ({ ok: false, error, message });

/** Douglas-Peucker on a local equirectangular projection; iterative so 100,000 points cannot overflow the stack. */
export function simplify(points: LatLon[], toleranceM: number): LatLon[] {
  if (points.length < 3) return points.slice();
  const lat0 = points[0]!.lat;
  const kx = Math.cos((lat0 * Math.PI) / 180) * 111_320;
  const ky = 110_540;
  const xy = points.map((p) => ({ x: (p.lon - points[0]!.lon) * kx, y: (p.lat - lat0) * ky }));
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const A = xy[a]!;
    const B = xy[b]!;
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const len2 = dx * dx + dy * dy;
    let maxD = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const P = xy[i]!;
      let t = len2 === 0 ? 0 : ((P.x - A.x) * dx + (P.y - A.y) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(P.x - (A.x + t * dx), P.y - (A.y + t * dy));
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx !== -1 && maxD > toleranceM) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i] === 1).map((p) => ({ lat: p.lat, lon: p.lon }));
}

function smooth(values: number[]): number[] {
  const half = Math.floor(SMOOTH_WINDOW / 2);
  return values.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(values.length - 1, i + half); j++) {
      sum += values[j]!;
      count++;
    }
    return sum / count;
  });
}

function gainLoss(smoothed: number[]): { gainM: number; lossM: number } {
  let ref = smoothed[0]!;
  let gain = 0;
  let loss = 0;
  for (const v of smoothed) {
    if (v - ref >= ELEVATION_THRESHOLD_M) {
      gain += v - ref;
      ref = v;
    } else if (ref - v >= ELEVATION_THRESHOLD_M) {
      loss += ref - v;
      ref = v;
    }
  }
  return { gainM: gain, lossM: loss };
}

export function analyzeTrack(segments: TrackPoint[][]): AnalyzeResult {
  // Join the segments and drop consecutive duplicates.
  const points: TrackPoint[] = [];
  for (const seg of segments) {
    for (const p of seg) {
      const last = points.at(-1);
      if (!last || last.lat !== p.lat || last.lon !== p.lon) {
        const ok = p.ele !== undefined && p.ele >= ELEVATION_RANGE_M.min && p.ele <= ELEVATION_RANGE_M.max;
        points.push(ok || p.ele === undefined ? p : { ...p, ele: undefined });
      }
      if (points.length > MAX_POINTS) return fail("too_many_points", "This track has more than 100,000 points. Export a simplified track or split the ride.");
    }
  }
  if (points.length === 0) return fail("no_track_points", "The file has no usable track points.");

  // Distances, with the sanity checks that catch corrupt or stitched tracks.
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const d = haversineKm(a, b);
    if (d > MAX_JUMP_KM) return fail("teleport", "The track jumps more than 5 km between two points. Is it made of separate rides?");
    if (a.time !== undefined && b.time !== undefined && b.time > a.time && d / ((b.time - a.time) / 3_600_000) > MAX_SPEED_KMH) {
      return fail("teleport", "The track contains impossible speeds, so the GPS data looks corrupt.");
    }
    cum.push(cum[i - 1]! + d);
  }
  const distanceKm = cum.at(-1)!;

  if (points.length < MIN_POINTS && distanceKm < MIN_LENGTH_KM) {
    return fail("too_few_points", `Only ${points.length} track point${points.length === 1 ? "" : "s"} found; a trail needs at least 50 points or 500 m.`);
  }
  if (distanceKm < MIN_DISTANCE_KM) return fail("too_few_points", "The track barely moves (under 50 m), so there is no route to show.");
  if (points.some((p) => Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180)) {
    return fail("invalid_coordinates", "The track has positions that are not on Earth, so the GPS data looks corrupt.");
  }
  if (distanceKm > MAX_LENGTH_KM) return fail("too_long", "The track is longer than 500 km.");

  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
    minLon = Math.min(minLon, p.lon); maxLon = Math.max(maxLon, p.lon);
  }

  // Elevation (only when most points carry it).
  let elevation: TrackAnalysis["elevation"] = null;
  let eles: number[] | null = null;
  if (points.filter((p) => p.ele !== undefined).length >= points.length * 0.8) {
    let prev = points.find((p) => p.ele !== undefined)!.ele!;
    eles = points.map((p) => (prev = p.ele ?? prev));
    const { gainM, lossM } = gainLoss(smooth(eles));
    elevation = { gainM: Math.round(gainM), lossM: Math.round(lossM), minM: Math.round(eles.reduce((a, b) => Math.min(a, b))), maxM: Math.round(eles.reduce((a, b) => Math.max(a, b))) };
  }

  // Timing (only when most points carry a time).
  let timing: TrackAnalysis["timing"] = null;
  if (points.filter((p) => p.time !== undefined).length >= points.length * 0.8) {
    let moving = 0, stopped = 0, movingKm = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!, b = points[i]!;
      if (a.time === undefined || b.time === undefined || b.time <= a.time) continue;
      const dt = (b.time - a.time) / 1000;
      const d = cum[i]! - cum[i - 1]!;
      if (d / (dt / 3600) > 1) { moving += dt; movingKm += d; } else stopped += dt;
    }
    timing = { movingSeconds: Math.round(moving), stoppedSeconds: Math.round(stopped), avgMovingSpeedKmh: moving > 0 ? Math.round((movingKm / (moving / 3600)) * 10) / 10 : 0 };
  }

  const stride = Math.ceil(points.length / SIMPLIFY_INPUT_CAP);
  const thinned = stride > 1 ? points.filter((_, i) => i % stride === 0 || i === points.length - 1) : points;
  const simplified = simplify(thinned, SIMPLIFY_TOLERANCE_M);

  // Elevation profile: at most 300 samples spread evenly along the distance.
  let profile: TrackAnalysis["profile"] = null;
  if (eles) {
    const out: { d: number; e: number }[] = [];
    if (points.length <= PROFILE_POINTS) {
      points.forEach((_, i) => out.push({ d: Math.round(cum[i]! * 1000) / 1000, e: Math.round(eles![i]! * 10) / 10 }));
    } else {
      let j = 0;
      for (let k = 0; k < PROFILE_POINTS; k++) {
        const target = (distanceKm * k) / (PROFILE_POINTS - 1);
        while (j < cum.length - 2 && cum[j + 1]! < target) j++;
        const span = cum[j + 1]! - cum[j]!;
        const t = span === 0 ? 0 : Math.min(1, Math.max(0, (target - cum[j]!) / span));
        out.push({ d: Math.round(target * 1000) / 1000, e: Math.round((eles[j]! + t * (eles[j + 1]! - eles[j]!)) * 10) / 10 });
      }
    }
    profile = out;
  }

  const fingerprint = createHash("sha256")
    .update(JSON.stringify(simplified.map((p) => [Number(p.lat.toFixed(4)), Number(p.lon.toFixed(4))])))
    .digest("hex");

  return {
    ok: true,
    analysis: {
      pointCount: points.length,
      distanceKm: Math.round(distanceKm * 100) / 100,
      start: { lat: points[0]!.lat, lon: points[0]!.lon },
      end: { lat: points.at(-1)!.lat, lon: points.at(-1)!.lon },
      bounds: { minLat, maxLat, minLon, maxLon },
      elevation,
      timing,
      simplified,
      profile,
      fingerprint,
    },
  };
}
