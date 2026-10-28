import { haversine } from './geo';

export type MotionFix = { t: number; lat: number; lng: number; /** metres per second; null or negative means the phone has no reading */ speed?: number | null; /** metres */ acc?: number };
export type MotionState = { stopped: boolean; /** when the current slow period began */ runStart?: number; /** where it began */ anchor?: { lat: number; lng: number }; lastFixAt: number; /** fixes in a row that argue against a stop; a stop is only left on two */ against?: number; /** when the current spell of poor-accuracy fixes began, while stopped */ poorSince?: number };
export const initialMotion: MotionState = { stopped: false, lastFixAt: 0 };

const DWELL_MS = 8000;
const SLOW_KMH = 2;
const MOVING_KMH = 6;
// A reading this fast leaves a stop at once: it is not jitter.
const SURE_KMH = 15;
const BEST_ACCURACY_M = 25;
// With no speed reading the position is all there is, so it must be good and the stopped area small.
const NO_SPEED_ACCURACY_M = 10;
const NO_SPEED_RADIUS_M = 6;
const STALE_MS = 5000;
// Once stopped, fixes too poor to judge by hold the stop this long before it is given up.
const POOR_GRACE_MS = 30_000;
// Fixes in a row against a stop needed to leave it.
const LEAVE_AFTER = 2;
// The stopped area grows with the fix's accuracy: a 15 m fix may sit 15 m from the truth.
const radiusFor = (hasSpeed: boolean, acc?: number) => (hasSpeed ? Math.min(20, Math.max(8, acc ?? 8)) : NO_SPEED_RADIUS_M);

/**
 * Decides whether the vehicle is really stopped. One GPS reading is not trusted: a parked phone can keep reporting
 * 1 km/h, and its position wanders by metres. Stopped needs 8 seconds in a row of slow readings (under 2 km/h, or no
 * speed reading) that all stay within a small radius (8 to 20 m by the fix's accuracy, or 6 m with no speed reading) of
 * where the slow period began, on fixes of 25 m accuracy or better (10 m or better with no speed reading).
 *
 * Leaving a stop is harder than entering one (hysteresis): it takes two fixes in a row at 6 km/h or more or outside the
 * radius, or one at 15 km/h or more or beyond twice the radius, so a lone spike or jump does not flip it. Between 2 and 6
 * km/h changes nothing once stopped, but stops a stop from starting. Fixes too poor to judge by neither confirm nor break
 * a stop for up to 30 s (their position and speed are noise); before a stop they reset it. When unsure, it says moving.
 */
export function stepMotion(s: MotionState, f: MotionFix): MotionState {
  if (f.t <= s.lastFixAt) return s;
  const reset: MotionState = { stopped: false, lastFixAt: f.t };
  const hasSpeed = f.speed != null && f.speed >= 0;
  const poor = (f.acc != null && f.acc > BEST_ACCURACY_M) || (!hasSpeed && (f.acc == null || f.acc > NO_SPEED_ACCURACY_M));
  if (poor) {
    if (!s.stopped) return reset;
    const poorSince = s.poorSince ?? f.t;
    return f.t - poorSince > POOR_GRACE_MS ? reset : { ...s, lastFixAt: f.t, poorSince };
  }
  const kmh = hasSpeed ? (f.speed as number) * 3.6 : 0;
  const radius = radiusFor(hasSpeed, f.acc);
  const dist = s.anchor ? haversine(s.anchor, f) : 0;
  const slow = !hasSpeed || kmh < SLOW_KMH;
  const begin = (): MotionState => (slow ? { stopped: false, runStart: f.t, anchor: { lat: f.lat, lng: f.lng }, lastFixAt: f.t } : reset);
  const away = (hasSpeed && kmh >= MOVING_KMH) || dist > radius;
  if (s.stopped) {
    if (away) {
      const against = (s.against ?? 0) + 1;
      const sure = kmh >= SURE_KMH || dist > radius * 2;
      if (sure || against >= LEAVE_AFTER) return slow ? begin() : reset;
      return { ...s, lastFixAt: f.t, against, poorSince: undefined };
    }
    return { ...s, lastFixAt: f.t, against: slow ? 0 : s.against, poorSince: undefined };
  }
  if (away) return begin();
  if (!slow) return reset;
  if (s.runStart === undefined) return begin();
  return { ...s, stopped: f.t - s.runStart >= DWELL_MS, lastFixAt: f.t };
}

/** Stopped, and the last fix is recent. No fix for 5 seconds means the answer is unknown, so not stopped. */
export const isStopped = (s: MotionState, now: number) => s.stopped && now - s.lastFixAt <= STALE_MS;
