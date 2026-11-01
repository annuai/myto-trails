/** The three columns of the time wheel: hour 1 to 12, minute in steps, and AM or PM. A time is minutes after midnight. */
export const MINUTE_STEP = 5;
export const HOURS = Array.from({ length: 12 }, (_, i) => `${i + 1}`);
export const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => String(i * MINUTE_STEP).padStart(2, '0'));
export const PERIODS = ['AM', 'PM'];

/** The wheel positions (indices into the three lists) for a time. A minute off the step rounds to the nearest. */
export function toWheel(minutes: number): { hour: number; minute: number; period: number } {
  const total = ((Math.round(minutes / MINUTE_STEP) * MINUTE_STEP) % 1440 + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  return { hour: (h24 % 12 || 12) - 1, minute: (total % 60) / MINUTE_STEP, period: h24 >= 12 ? 1 : 0 };
}

/** The time for wheel positions. 12 AM is midnight and 12 PM is noon. */
export function fromWheel(hour: number, minute: number, period: number): number {
  return ((hour + 1) % 12 + (period ? 12 : 0)) * 60 + minute * MINUTE_STEP;
}
