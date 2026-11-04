/**
 * Whether the GPS signal is lost, for the warning on the live screen. Before, the warning fired when the last fix was 15 s old and
 * the rider had been moving at that fix. The background recorder sent no fixes while the phone stood still (a 5 m distance filter),
 * so every stop at a light, longer than 15 s, read as a lost signal; and one late fix cleared it and the next gap brought it back.
 * Dropping the filter to zero helped but did not end it: a phone that is standing still may still send nothing for a while (the
 * system holds back updates when nothing has moved), so a silence while stopped proves nothing about the signal. Two changes:
 * a stopped rider needs a far longer silence to raise the warning, and a silent GPS is asked directly for a position (`shouldProbe`)
 * instead of being assumed gone; an answer is a fix like any other.
 * It takes a long silence to raise the warning and a steady run of fresh fixes to clear it.
 */
export const LOST_AFTER_MS = 20_000;
/** The same, for a rider who is standing still: only a very long silence is a loss. */
export const STOPPED_LOST_AFTER_MS = 180_000;
/** A silent GPS is asked for a position after this long, and again no more often than this. */
export const PROBE_AFTER_MS = 8_000;
export const PROBE_EVERY_MS = 8_000;
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
export function stepGpsHealth(s: GpsHealth, i: { now: number; lastFixAt: number; resumedAt?: number; /** The rider is standing still (a light, a stop): silence is expected. */ stopped?: boolean }): GpsHealth {
  if (i.lastFixAt <= 0) return startGpsHealth;
  const since = Math.max(i.lastFixAt, i.resumedAt ?? 0);
  const gap = i.now - since;
  if (!s.lost) return gap >= (i.stopped ? STOPPED_LOST_AFTER_MS : LOST_AFTER_MS) ? { lost: true, freshSince: null } : s;
  if (gap > FRESH_MS) return { lost: true, freshSince: null };
  const freshSince = s.freshSince ?? i.now;
  return i.now - freshSince >= CLEAR_AFTER_MS ? startGpsHealth : { lost: true, freshSince };
}

/** The signal is there but poor: say so instead of saying it is gone. */
export const isWeak = (accuracyM: number | undefined) => accuracyM !== undefined && accuracyM > WEAK_ACCURACY_M;

/** Whether to ask the phone for a position now: nothing has been heard for a while, and no question is already out or was asked a moment ago. */
export const shouldProbe = (i: { now: number; lastSignalAt: number; probing: boolean; lastProbeAt: number }): boolean =>
  !i.probing && i.lastSignalAt > 0 && i.now - i.lastSignalAt >= PROBE_AFTER_MS && i.now - i.lastProbeAt >= PROBE_EVERY_MS;
