export type DateRange = { start?: string; end?: string };

/**
 * What a tap on a day does to a range being picked: the first tap starts it, the second ends it (an earlier day swaps the two),
 * and a tap once it is complete starts a new one. Dates are YYYY-MM-DD, which sort as text.
 */
export function tapDay(range: DateRange, day: string): DateRange {
  if (!range.start || range.end) return { start: day };
  return day < range.start ? { start: day, end: range.start } : { start: range.start, end: day };
}

/** Whether a day is inside the range, ends included. A range with only a start is just that day. */
export const inRange = (range: DateRange, day: string): boolean => !!range.start && day >= range.start && day <= (range.end ?? range.start);
