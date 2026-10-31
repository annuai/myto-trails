/**
 * The time now, in milliseconds. Screens that show a countdown, an age or the length of a ride read the clock while they draw, on purpose:
 * they draw again on a timer, or on every fix. Going through this one function says so, and is the one place a test can replace the clock.
 */
export const nowMs = (): number => Date.now();
