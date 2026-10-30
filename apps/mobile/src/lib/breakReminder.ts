/** Riding this long without a proper stop earns a reminder to take a break, unless the rider chose another time in Notifications. */
export const BREAK_AFTER_MS = 2 * 3_600_000;
/** What the rider can choose in Notifications: minutes of riding before a break reminder. 0 is off. */
export const BREAK_CHOICES = [0, 60, 90, 120, 180] as const;
export const DEFAULT_BREAK_MIN = 120;
export const breakLabel = (min: number) => (min === 0 ? 'Off' : min === 60 ? '1 hour' : min === 90 ? '1½ hours' : `${min / 60} hours`);
/** A stop (or a pause) this long counts as a break and starts the count again; a traffic light or a photo does not. */
export const BREAK_COUNTS_MS = 10 * 60_000;

export type BreakState = { /** When the ride count began, null while there is no ride or just after a break. */ ridingSince: number | null; /** When the current stop began; null while moving. */ stoppedSince: number | null; /** The next reminder is due at this time. */ nextAt: number | null };
export const startBreak: BreakState = { ridingSince: null, stoppedSince: null, nextAt: null };

/**
 * One step of the break watch. `stopped` is the reliable-stop signal, `paused` is the rider's own pause. Two hours of riding with no
 * stop of ten minutes or more gives one reminder, and another for each further such stretch; a long enough stop starts the count over.
 */
export function stepBreak(s: BreakState, i: { now: number; running: boolean; paused: boolean; stopped: boolean; /** Riding time before a reminder, in milliseconds. 0 or less is off. */ afterMs: number }): { state: BreakState; remind: boolean } {
  if (!i.running || i.afterMs <= 0) return { state: startBreak, remind: false };
  if (i.paused || i.stopped) {
    const stoppedSince = s.stoppedSince ?? i.now;
    // A break taken: the count goes back to nothing and starts again when the rider rides.
    return i.now - stoppedSince >= BREAK_COUNTS_MS ? { state: { ridingSince: null, stoppedSince, nextAt: null }, remind: false } : { state: { ...s, stoppedSince }, remind: false };
  }
  const ridingSince = s.ridingSince ?? i.now;
  const nextAt = s.nextAt ?? ridingSince + i.afterMs;
  return i.now >= nextAt ? { state: { ridingSince, stoppedSince: null, nextAt: nextAt + i.afterMs }, remind: true } : { state: { ridingSince, stoppedSince: null, nextAt }, remind: false };
}
