type TripRide = { startedAt: number; distanceKm: number; durationSec: number };
export type TripDay<R extends TripRide> = { /** The day the rides started, on the rider's own clock (YYYY-MM-DD). */ date: string; rides: R[]; distanceKm: number; durationSec: number };

const pad = (n: number) => String(n).padStart(2, '0');
const dayOf = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

/** The rides of a trip grouped by day, first day first, with each day's totals. */
export function tripDays<R extends TripRide>(rides: R[]): TripDay<R>[] {
  const byDay = new Map<string, R[]>();
  for (const r of [...rides].sort((a, b) => a.startedAt - b.startedAt)) {
    const k = dayOf(r.startedAt);
    byDay.set(k, [...(byDay.get(k) ?? []), r]);
  }
  return [...byDay].map(([date, list]) => ({ date, rides: list, distanceKm: +list.reduce((n, r) => n + r.distanceKm, 0).toFixed(1), durationSec: list.reduce((n, r) => n + r.durationSec, 0) }));
}

export function tripTotals(rides: TripRide[]): { days: number; distanceKm: number; durationSec: number } {
  return { days: tripDays(rides).length, distanceKm: +rides.reduce((n, r) => n + r.distanceKm, 0).toFixed(1), durationSec: rides.reduce((n, r) => n + r.durationSec, 0) };
}
