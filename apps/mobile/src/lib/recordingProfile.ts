import * as Location from 'expo-location';

/**
 * How hard the GPS works while a ride records. `full` is the original setting. `saver` and `idle` sample less often to save battery,
 * so distance and top speed may read slightly low. `timeInterval` is honoured on Android; iOS saves through the lower accuracy.
 */
export type RecordingProfile = 'full' | 'saver' | 'idle';
export const PROFILE_OPTIONS: Record<RecordingProfile, { accuracy: Location.Accuracy; timeInterval: number }> = {
  full: { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000 },
  saver: { accuracy: Location.Accuracy.High, timeInterval: 3000 },
  idle: { accuracy: Location.Accuracy.Balanced, timeInterval: 10_000 },
};

export const SAVER_BELOW_PCT = 20;
/** While navigating, saver only from this low. */
export const SAVER_ALWAYS_BELOW_PCT = 10;
/** Saver is left only this many points above where it began, so a battery hovering at the line does not flip it. */
export const PCT_HYSTERESIS = 5;
export const IDLE_AFTER_STOP_MS = 120_000;
/** Changes other than waking wait this long after the last one, so the GPS is not restarted over and over. */
export const MIN_SWITCH_MS = 60_000;
/** A speed this high leaves idle at once. */
export const WAKE_KMH = 5;

/** Which profile to record with now. Unknown battery counts as healthy; `enabled` false is always `full`. */
export function chooseProfile(i: { current: RecordingProfile; lastSwitchAt: number; now: number; batteryPct: number | null; charging: boolean; navigating: boolean; stoppedForMs: number; speedKmh: number; enabled: boolean }): RecordingProfile {
  if (!i.enabled) return 'full';
  const line = (i.navigating ? SAVER_ALWAYS_BELOW_PCT : SAVER_BELOW_PCT) + (i.current === 'saver' ? PCT_HYSTERESIS : 0);
  const low = !i.charging && i.batteryPct !== null && (i.current === 'saver' ? i.batteryPct < line : i.batteryPct <= line);
  const moving: RecordingProfile = low ? 'saver' : 'full';
  if (i.current === 'idle' && i.speedKmh >= WAKE_KMH) return moving;
  const settled = i.now - i.lastSwitchAt >= MIN_SWITCH_MS;
  if (i.current === 'idle') return 'idle';
  const want: RecordingProfile = i.stoppedForMs >= IDLE_AFTER_STOP_MS && i.speedKmh < WAKE_KMH ? 'idle' : moving;
  return want !== i.current && settled ? want : i.current;
}
