import { haversine, type LatLng } from './geo';

/** Steps (fix to fix) whose median is taken: a glitch lasts a fix or two, a real burst of speed lasts longer. */
export const TOP_SPEED_WINDOW = 5;
const BEST_ACCURACY_M = 25;
/** The coarsest fix the track keeps (`MAX_ACCURACY_M` in track.ts). Battery saver and idle record at 30 to 65 m, so every fix fails the strict limit. */
const COARSE_ACCURACY_M = 100;
const MIN_STEPS = 3;
const MIN_STEP_S = 0.5;
const MAX_STEP_S = 60;

export const medianOf = (xs: number[]): number => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)]! : 0; };

/**
 * The fastest the rider held for about five steps in a row, in km/h. The old way took the fastest single step, so one fix that
 * jumped 45 m in a second read as 162 km/h. A median of five steps cannot be moved by one or two bad fixes; fixes of poor
 * accuracy and steps too close together in time (the speed of a pair 0.2 s apart is mostly noise) are left out.
 * A ride recorded at coarse accuracy (battery saver, idle) has no fix within 25 m, which used to read as 0 km/h while the same fixes
 * counted toward the distance. When nothing passes the strict limit, the fixes the track keeps are used instead: less exact, not zero.
 */
export function topSpeedKmh(segments: LatLng[][]): number {
  return topSpeedWithin(segments, BEST_ACCURACY_M) || topSpeedWithin(segments, COARSE_ACCURACY_M);
}

function topSpeedWithin(segments: LatLng[][], maxAccuracyM: number): number {
  let top = 0;
  for (const seg of segments) {
    const speeds: number[] = [];
    let prev: LatLng | undefined;
    for (const p of seg) {
      if (p.acc != null && p.acc > maxAccuracyM) continue;
      if (prev && p.t != null && prev.t != null) {
        const dt = (p.t - prev.t) / 1000;
        if (dt < MIN_STEP_S) continue; // keep `prev`: the next fix is measured against the earlier one
        if (dt <= MAX_STEP_S) speeds.push((haversine(prev, p) / dt) * 3.6);
        else speeds.length = 0; // a gap breaks the run
      }
      prev = p;
    }
    // A short run (three or four steps) is judged by all of them.
    const w = Math.min(TOP_SPEED_WINDOW, speeds.length);
    if (w < MIN_STEPS) continue;
    for (let i = 0; i + w <= speeds.length; i++) top = Math.max(top, medianOf(speeds.slice(i, i + w)));
  }
  return top;
}
