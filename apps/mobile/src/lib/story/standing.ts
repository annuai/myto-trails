import { bandOf, cellOf, percentileBelow, type CohortRow, type StandingMetric } from '@moto-trails/domain';
import type { RideSummary } from '@/api/standing';
import type { Ride } from '@/store/rides';
import type { Moment } from './moment';

const pad = (n: number) => String(n).padStart(2, '0');
/** The rider's own calendar date (not UTC), YYYY-MM-DD. */
export const localDay = (t: number): string => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const localPeriod = (t: number): string => localDay(t).slice(0, 7);

/** The coarse cell a ride started in, from its first waypoint. Undefined when there is none. */
export function cellOfRide(r: Ride): string | undefined {
  const w = r.waypoints[0];
  return w ? cellOf(w.lat, w.lng) : undefined;
}

/** Whether a ride may ever be summarised: not the sample, and it has a first waypoint. */
export const summarisable = (r: Ride): boolean => !r.sample && cellOfRide(r) !== undefined;

/**
 * What may leave the phone about a ride: exactly these five keys. The cell is about 100 km wide; there is no route, coordinate or time of day.
 * `ref` is the ride's random upload ref (never the ride id, which encodes its start time). The sample ride and a ride with no waypoint are never summarised.
 */
export function summaryOf(r: Ride, ref: string): RideSummary | undefined {
  const cell = summarisable(r) ? cellOfRide(r) : undefined;
  if (cell === undefined) return undefined;
  return { ref, day: localDay(r.startedAt), distanceKm: r.distanceKm, durationSec: Math.round(r.durationSec), cell };
}

/** "You rode further than 70% of riders near your area this month." Never for a small cohort and never below the 50th percentile. */
export function standingMoment(i: { metric: StandingMetric; value: number; row: CohortRow | undefined; region: string }): Moment | undefined {
  if (!i.row) return undefined;
  const p = percentileBelow(i.value, i.row);
  if (p === null || p < 50) return undefined;
  return { id: `standing:${i.metric}:${bandOf(p)}`, kind: 'standing', title: `You rode further than ${p}% of riders near ${i.region} this month.`, body: '', pose: 'standing-up' };
}

/** The cell of the rider's most recent ride and their distance this month in that cell only (the server cohort sums per cell too). */
export function currentStanding(rides: readonly Ride[], now: number): { cell: string; value: number } | undefined {
  const real = rides.filter((r) => !r.sample);
  const period = localPeriod(now);
  const latest = [...real].filter((r) => cellOfRide(r) !== undefined).sort((a, b) => b.startedAt - a.startedAt)[0];
  if (!latest) return undefined;
  const cell = cellOfRide(latest) as string;
  const value = real.filter((r) => localPeriod(r.startedAt) === period && cellOfRide(r) === cell).reduce((s, r) => s + r.distanceKm, 0);
  return { cell, value };
}
