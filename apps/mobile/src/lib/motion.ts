import { haversine } from './geo';

export type MotionFix = { t: number; lat: number; lng: number; /** metres per second; null or negative means the phone has no reading */ speed?: number | null; /** metres */ acc?: number };
export type MotionState = { stopped: boolean; /** when the current slow period began */ runStart?: number; /** where it began */ anchor?: { lat: number; lng: number }; lastFixAt: number };
export const initialMotion: MotionState = { stopped: false, lastFixAt: 0 };

const DWELL_MS = 8000;
const SLOW_KMH = 2;
const MOVING_KMH = 6;
const BEST_ACCURACY_M = 50;
const STALE_MS = 5000;
const radiusFor = (acc?: number) => Math.max(8, 1.5 * (acc ?? 0));

/**
 * Decides whether the vehicle is really stopped. One GPS reading is not trusted: a parked phone can keep reporting
 * 1 km/h, and its position wanders by metres. Stopped needs 8 seconds in a row of slow readings (under 2 km/h, or no
 * speed reading) that all stay within a small radius of where the slow period began, on fixes of 50 m accuracy or
 * better. Any reading of 6 km/h or more, or a position outside that radius, means moving at once. Between 2 and 6 km/h
 * changes nothing once stopped (so it does not flicker), but stops a stop from starting. When unsure, it says moving.
 */
export function stepMotion(s: MotionState, f: MotionFix): MotionState {
  if (f.t <= s.lastFixAt) return s;
  const reset: MotionState = { stopped: false, lastFixAt: f.t };
  if (f.acc != null && f.acc > BEST_ACCURACY_M) return reset;
  const hasSpeed = f.speed != null && f.speed >= 0;
  const kmh = hasSpeed ? (f.speed as number) * 3.6 : 0;
  if (hasSpeed && kmh >= MOVING_KMH) return reset;
  const slow = !hasSpeed || kmh < SLOW_KMH;
  const begin = (): MotionState => (slow ? { stopped: false, runStart: f.t, anchor: { lat: f.lat, lng: f.lng }, lastFixAt: f.t } : reset);
  if (s.anchor && haversine(s.anchor, f) > radiusFor(f.acc)) return begin();
  if (!slow) return s.stopped ? { ...s, lastFixAt: f.t } : reset;
  if (s.runStart === undefined) return begin();
  return { ...s, stopped: s.stopped || f.t - s.runStart >= DWELL_MS, lastFixAt: f.t };
}

/** Stopped, and the last fix is recent. No fix for 5 seconds means the answer is unknown, so not stopped. */
export const isStopped = (s: MotionState, now: number) => s.stopped && now - s.lastFixAt <= STALE_MS;
