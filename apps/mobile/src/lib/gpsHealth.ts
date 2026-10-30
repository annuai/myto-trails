/**
 * Whether the GPS signal is lost, for the warning on the live screen. Before, the warning fired when the last fix was 15 s old and
 * the rider had been moving at that fix. The background recorder sent no fixes while the phone stood still (a 5 m distance filter),
 * so every stop at a light, longer than 15 s, read as a lost signal; and one late fix cleared it and the next gap brought it back.
 * Now fixes keep coming while stopped, so a silence means something. It takes a long silence to raise the warning and a steady
 * run of fresh fixes to clear it.
 */
export const LOST_AFTER_MS = 20_000;
/** A fix this recent counts as fresh. */
export const FRESH_MS = 4_000;
/** How long fixes must stay fresh before a raised warning goes away. */
export const CLEAR_AFTER_MS = 5_000;
/** A fix less accurate than this is a weak signal, not a lost one. */
export const WEAK_ACCURACY_M = 50;

export type GpsHealth = { lost: boolean; /** When the fixes became fresh again, while a warning is still up. */ freshSince: number | null };
export const startGpsHealth: GpsHealth = { lost: false, freshSince: null };

/**
 * One step, once a second. `lastFixAt` is when the last fix arrived (0 for none yet); `resumedAt` is when the app came back to the
 * screen, since a phone that was locked sends nothing to a foreground watch and that silence is not a lost signal.
 */
export function stepGpsHealth(s: GpsHealth, i: { now: number; lastFixAt: number; resumedAt?: number }): GpsHealth {
  if (i.lastFixAt <= 0) return startGpsHealth;
  const since = Math.max(i.lastFixAt, i.resumedAt ?? 0);
  const gap = i.now - since;
  if (!s.lost) return gap >= LOST_AFTER_MS ? { lost: true, freshSince: null } : s;
  if (gap > FRESH_MS) return { lost: true, freshSince: null };
  const freshSince = s.freshSince ?? i.now;
  return i.now - freshSince >= CLEAR_AFTER_MS ? startGpsHealth : { lost: true, freshSince };
}

/** The signal is there but poor: say so instead of saying it is gone. */
export const isWeak = (accuracyM: number | undefined) => accuracyM !== undefined && accuracyM > WEAK_ACCURACY_M;
