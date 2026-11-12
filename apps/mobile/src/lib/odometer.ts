/** The digits of a whole-km total, padded with leading zeros to at least `min` columns, most significant first. */
export function digitsOf(km: number, min = 5): number[] {
  const s = String(Math.max(0, Math.floor(km))).padStart(min, '0');
  return s.split('').map(Number);
}

export type Roll = { from: number; /** Where the column ends, counted forward on a strip of two 0 to 9 runs: 10 to 19 means it wrapped through 9. */ to: number };

/**
 * How each column moves from one total to another. Columns only ever roll forward (a total only grows), so a digit that is lower than
 * before rolls through 9 and back round to it, as a real odometer does. A total that shrank (rides deleted) just sits at its new value.
 */
export function rollPlan(fromKm: number, toKm: number, min = 5): Roll[] {
  const len = Math.max(min, String(Math.floor(Math.max(fromKm, toKm))).length);
  const a = digitsOf(fromKm, len), b = digitsOf(toKm, len);
  if (toKm < fromKm) return b.map((d) => ({ from: d, to: d }));
  return b.map((d, i) => ({ from: a[i]!, to: d < a[i]! ? d + 10 : d }));
}

/** Whole steps the fastest column passes through, for how many ticks the roll deserves. */
export const rollSteps = (plan: Roll[]): number => plan.reduce((m, r) => Math.max(m, r.to - r.from), 0);
