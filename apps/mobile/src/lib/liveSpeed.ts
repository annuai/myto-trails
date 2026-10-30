/**
 * The speed shown while riding. Two things made it wrong before: a fix that had not left the drift radius returned early, so the
 * last riding speed stayed on screen while parked; and a parked phone's own speed reading (often 1 to 2 m/s) was trusted.
 */
const MIN_WINDOW_S = 2;
/** Below this the rider is standing: a position wandering a metre or two reads as this much at most. */
const STILL_KMH = 2;
/** A reading older than this is not a speed any more. */
export const SPEED_STALE_MS = 4000;

const kmhOf = (m: number, s: number) => (m / s) * 3.6;

/**
 * The speed for one fix. `stepM` and `dtSec` are from the last kept point to this fix, `inside` says the fix is within its drift
 * radius of that point, and `reportedMps` is the phone's own reading (null or negative when it has none). Inside the radius the
 * position must agree with the reading, so a phone that says 1.6 m/s while not moving reads zero; outside it, the reading is trusted.
 */
export function fixSpeedKmh(i: { stepM: number; dtSec: number; inside: boolean; reportedMps?: number | null }): number {
  const reported = i.reportedMps != null && i.reportedMps >= 0 ? i.reportedMps * 3.6 : null;
  // Inside the radius a step is judged over at least two seconds, so one fix wandering a few metres does not read as speed.
  const derived = i.dtSec > 0 ? kmhOf(i.stepM, i.inside ? Math.max(i.dtSec, MIN_WINDOW_S) : i.dtSec) : 0;
  if (!i.inside) {
    // A reading far above what the position shows is a glitch: believe the track.
    if (reported === null) return derived;
    return derived > 0 && reported > derived * 1.5 + 10 ? derived : reported;
  }
  // Inside the drift radius the position alone proves nothing, so without the phone's own reading the rider is not moving.
  if (reported === null) return 0;
  const v = Math.min(reported, derived);
  return v < STILL_KMH ? 0 : v;
}

/** The speed to put on screen: nothing (null) once the last fix is old, since the rider may be anywhere between fixes. */
export const shownSpeedKmh = (kmh: number, lastFixAt: number, now: number): number | null => (lastFixAt > 0 && now - lastFixAt > SPEED_STALE_MS ? null : kmh);
