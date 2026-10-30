import { haversine, type LatLng } from './geo';

/** Steps (fix to fix) whose median is taken: a glitch lasts a fix or two, a real burst of speed lasts longer. */
export const TOP_SPEED_WINDOW = 5;
const BEST_ACCURACY_M = 25;
const MIN_STEPS = 3;
const MIN_STEP_S = 0.5;
const MAX_STEP_S = 60;

export const medianOf = (xs: number[]): number => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)]! : 0; };

/**
 * The fastest the rider held for about five steps in a row, in km/h. The old way took the fastest single step, so one fix that
 * jumped 45 m in a second read as 162 km/h. A median of five steps cannot be moved by one or two bad fixes; fixes of poor
 * accuracy and steps too close together in time (the speed of a pair 0.2 s apart is mostly noise) are left out.
 */
export function topSpeedKmh(segments: LatLng[][]): number {
  let top = 0;
  for (const seg of segments) {
    const speeds: number[] = [];
    let prev: LatLng | undefined;
    for (const p of seg) {
      if (p.acc != null && p.acc > BEST_ACCURACY_M) continue;
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
