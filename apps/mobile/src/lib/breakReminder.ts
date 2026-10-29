/** Riding this long without a proper stop earns a reminder to take a break. */
export const BREAK_AFTER_MS = 2 * 3_600_000;
/** A stop (or a pause) this long counts as a break and starts the count again; a traffic light or a photo does not. */
export const BREAK_COUNTS_MS = 10 * 60_000;

export type BreakState = { /** When the ride count began, null while there is no ride or just after a break. */ ridingSince: number | null; /** When the current stop began; null while moving. */ stoppedSince: number | null; /** The next reminder is due at this time. */ nextAt: number | null };
export const startBreak: BreakState = { ridingSince: null, stoppedSince: null, nextAt: null };

/**
 * One step of the break watch. `stopped` is the reliable-stop signal, `paused` is the rider's own pause. Two hours of riding with no
 * stop of ten minutes or more gives one reminder, and another for each further two hours; a long enough stop starts the count over.
 */
export function stepBreak(s: BreakState, i: { now: number; running: boolean; paused: boolean; stopped: boolean }): { state: BreakState; remind: boolean } {
  if (!i.running) return { state: startBreak, remind: false };
  if (i.paused || i.stopped) {
    const stoppedSince = s.stoppedSince ?? i.now;
    // A break taken: the count goes back to nothing and starts again when the rider rides.
    return i.now - stoppedSince >= BREAK_COUNTS_MS ? { state: { ridingSince: null, stoppedSince, nextAt: null }, remind: false } : { state: { ...s, stoppedSince }, remind: false };
  }
  const ridingSince = s.ridingSince ?? i.now;
  const nextAt = s.nextAt ?? ridingSince + BREAK_AFTER_MS;
  return i.now >= nextAt ? { state: { ridingSince, stoppedSince: null, nextAt: nextAt + BREAK_AFTER_MS }, remind: true } : { state: { ridingSince, stoppedSince: null, nextAt }, remind: false };
}
