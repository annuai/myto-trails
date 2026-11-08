/** When each of the three buzzes starts, in milliseconds. Each buzz is its own call, a little apart, so they stay three on iPhone (which fixes the length of a buzz) as well as on Android. */
export const BUZZ_STARTS_MS = [0, 800, 1600] as const;
/** How long one buzz lasts where the phone lets us choose. */
export const BUZZ_MS = 400;

/** The bike's engine on Android, as one vibration pattern (off, on, off, on, ...): a firm start, then a tap every `gap` ms until `totalMs`. One native call instead of a stream of them, which also keeps scrolling smooth. */
export function enginePattern(totalMs: number, start = 90, tap = 30, gap = 90): number[] {
  const pattern = [0, start];
  for (let t = start; t + gap + tap <= totalMs; t += gap + tap) pattern.push(gap, tap);
  return pattern;
}
