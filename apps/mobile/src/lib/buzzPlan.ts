/** When each of the three buzzes starts, in milliseconds. Each buzz is its own call, a little apart, so they stay three on iPhone (which fixes the length of a buzz) as well as on Android. */
export const BUZZ_STARTS_MS = [0, 800, 1600] as const;
/** How long one buzz lasts where the phone lets us choose. */
export const BUZZ_MS = 400;
