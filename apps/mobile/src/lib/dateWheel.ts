import { todayISO } from './dates';

/**
 * The logic of the date wheels: day, month and year columns that read and write 'YYYY-MM-DD' text. Months are 1 to 12 here
 * and 0 to 11 as wheel positions. The wheels never hold a date that does not exist (31 February) or one outside min and max.
 */
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** Default years offered: this many back and ahead of this year, unless min or max say otherwise. */
export const YEARS_BACK = 100;
export const YEARS_AHEAD = 5;

export type YearBounds = { first: number; last: number };
export type WheelPlace = { day: number; month: number; year: number };

const pad = (n: number) => String(n).padStart(2, '0');

/** Days in a month (month 1 to 12), leap years included. */
export const daysInMonth = (year: number, month: number): number => new Date(year, month, 0).getDate();

/** A day that fits in the month: 31 in February becomes the last day of February. */
export const clampDay = (year: number, month: number, day: number): number => Math.max(1, Math.min(daysInMonth(year, month), day));

/** A date pulled into min and max (either may be missing). Dates sort as text. */
export function clampToRange(iso: string, min?: string, max?: string): string {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

/** The first and last year on the wheel. A missing bound falls back to the default span around today; the range is never empty. */
export function yearBounds(min?: string, max?: string, today: string = todayISO()): YearBounds {
  const now = +today.slice(0, 4);
  const first = min ? +min.slice(0, 4) : now - YEARS_BACK;
  const last = max ? +max.slice(0, 4) : now + YEARS_AHEAD;
  return { first, last: Math.max(first, last) };
}

export const dayItems = (year: number, month: number): string[] => Array.from({ length: daysInMonth(year, month) }, (_, i) => `${i + 1}`);
export const monthItems = (): string[] => MONTH_NAMES;
export const yearItems = ({ first, last }: YearBounds): string[] => Array.from({ length: last - first + 1 }, (_, i) => `${first + i}`);

/** Wheel positions for a date. A year outside the bounds sits at the nearest end. */
export function dateToWheel(iso: string, { first, last }: YearBounds): WheelPlace {
  const year = Math.max(first, Math.min(last, +iso.slice(0, 4)));
  return { day: +iso.slice(8, 10) - 1, month: +iso.slice(5, 7) - 1, year: year - first };
}

/** The date for wheel positions: the day is clamped to the month, then the date to min and max. */
export function dateFromWheel({ day, month, year }: WheelPlace, bounds: YearBounds, min?: string, max?: string): string {
  const y = bounds.first + year;
  const m = month + 1;
  return clampToRange(`${y}-${pad(m)}-${pad(clampDay(y, m, day + 1))}`, min, max);
}
