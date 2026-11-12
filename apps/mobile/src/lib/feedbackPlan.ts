/** Android's own vibration patterns (off, on, off, on, ...), because its haptic effects are too faint to feel on many phones. iPhone fixes the shape of its own taps. */
export const ANDROID_BUZZ = {
  tick: [0, 8],
  detent: [0, 6],
  settle: [0, 30],
  confirm: [0, 24, 60, 24],
  milestone: [0, 30, 90, 20, 60, 40],
} as const;

/** True when enough time has passed since the last tick, so a fast roll reads as a ratchet and not a buzz. */
export const tickDue = (lastAt: number, now: number, gapMs: number): boolean => now - lastAt >= gapMs;

/** Which band of `band` a speed is in: 0 for 0 to just under `band`, 1 for the next, and so on. */
export const bandOf = (kmh: number, band: number): number => Math.floor(Math.max(0, kmh) / band);

/**
 * How many band edges a speed crossed between two readings, always 0 or more (up or down both count as a crossing).
 * Nothing is crossed when either reading is missing, so a speed that comes back after a gap does not click.
 */
export function bandsCrossed(prev: number | null, next: number | null, band: number): number {
  if (prev === null || next === null) return 0;
  return Math.abs(bandOf(next, band) - bandOf(prev, band));
}

/**
 * When to tick while a number rolls through `steps` values over `ms`: spaced evenly, never closer than `minGapMs`, so a long roll
 * gets a ratchet and a short one just a few ticks. The first tick is at 0. No ticks for fewer than two steps.
 */
export function rollTickTimes(steps: number, ms: number, minGapMs: number): number[] {
  if (steps < 2 || ms <= 0) return [];
  const count = Math.min(steps, Math.max(1, Math.floor(ms / minGapMs)));
  return Array.from({ length: count }, (_, i) => Math.round((i * ms) / count));
}

/** The live speedometer ticks each time the shown speed passes a multiple of this (in km/h or mph, whichever the rider sees). */
export const SPEED_BAND = 10;
