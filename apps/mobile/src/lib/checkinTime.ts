const DAY_MIN = 24 * 60;

/** A sensible first arrival time: two hours from now, on a 15-minute step, as minutes after midnight. */
export function defaultArrivalMinutes(now: Date): number {
  const m = now.getHours() * 60 + now.getMinutes() + 120;
  return (Math.ceil(m / 15) * 15) % DAY_MIN;
}

/** The next time the clock shows `minutes` after midnight: today if it is still ahead, otherwise tomorrow. Milliseconds. */
export function nextOccurrence(now: Date, minutes: number): number {
  const d = new Date(now);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d.getTime() > now.getTime() ? d.getTime() : d.getTime() + DAY_MIN * 60_000;
}
