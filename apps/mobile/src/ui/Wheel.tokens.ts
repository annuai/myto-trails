import { size } from '@/theme/tokens';

/** The wheel columns and the dialog that holds them. `row` is one row's height; `rows` are visible at once (the chosen one in the middle). */
export const wheel = {
  row: size.compact,
  rows: 5,
  /** Opacity and scale of a row 0, 1 and 2 places from the chosen one. */
  fadeOpacity: [1, 0.45, 0.15],
  fadeScale: [1, 0.9, 0.8],
  /** Wheel width shares: the month column is wider than the day and the year. */
  narrow: 1,
  wide: 1.6,
  /** Wait after the last scroll event before a web wheel settles (the web has no scroll-end event for a snapped list). */
  settleMs: 120,
} as const;

export const dialog = { maxWidth: 340 } as const;
