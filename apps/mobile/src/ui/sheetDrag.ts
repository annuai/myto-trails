/** How far a sheet is pulled down before letting go closes it, in points. */
export const DISMISS_DISTANCE = 120;
/** A flick this fast (points per millisecond) closes it from a shorter pull. */
export const DISMISS_VELOCITY = 0.9;
/** The most a sheet can be pulled up past its resting place. */
export const MAX_PULL = 24;

/** Where the sheet sits for a drag of `dy` points: down follows the finger exactly; up gives a fifth of the way, up to MAX_PULL. */
export const dragOffset = (dy: number): number => (dy >= 0 ? dy : Math.max(dy * 0.2, -MAX_PULL));

/** Whether letting go at this drag and speed closes the sheet. */
export const shouldDismiss = (dy: number, vy: number): boolean => dy > DISMISS_DISTANCE || (dy > 20 && vy > DISMISS_VELOCITY);
