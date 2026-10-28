/** How long the bike must stand still before the ride pauses itself. */
export const AUTO_PAUSE_MS = 5 * 60_000;
/** After pausing itself the ride waits this long before it may resume, so a wobbling GPS cannot undo the pause at once. */
export const RESUME_GRACE_MS = 30_000;

export type AutoPauseState = { stoppedSince: number | null; /** When the ride paused itself; null when it did not (or the rider took over). */ pausedAt: number | null };
export const startAutoPause: AutoPauseState = { stoppedSince: null, pausedAt: null };

/**
 * One step of the opt-in "pause when stopped". `stopped` is the reliable-stop signal; `movingFast` is a fresh GPS fix at a
 * riding speed. Only a pause the ride made itself is ever undone by itself: one the rider made, or a resume the rider made,
 * is left alone.
 */
export function stepAutoPause(
  s: AutoPauseState,
  i: { now: number; enabled: boolean; running: boolean; paused: boolean; stopped: boolean; movingFast: boolean },
): { state: AutoPauseState; action: 'pause' | 'resume' | null } {
  if (!i.enabled || !i.running) return { state: startAutoPause, action: null };
  if (s.pausedAt !== null) {
    if (!i.paused) return { state: startAutoPause, action: null }; // the rider resumed by hand
    if (i.movingFast && i.now - s.pausedAt >= RESUME_GRACE_MS) return { state: startAutoPause, action: 'resume' };
    return { state: s, action: null };
  }
  if (i.paused || !i.stopped) return { state: startAutoPause, action: null };
  const stoppedSince = s.stoppedSince ?? i.now;
  if (i.now - stoppedSince >= AUTO_PAUSE_MS) return { state: { stoppedSince: null, pausedAt: i.now }, action: 'pause' };
  return { state: { stoppedSince, pausedAt: null }, action: null };
}
