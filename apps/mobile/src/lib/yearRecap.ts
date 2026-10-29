import { toISO } from './dates';
import type { Ride } from '@/store/rides';

type RecapRide = Pick<Ride, 'name' | 'startedAt' | 'durationSec' | 'distanceKm' | 'maxKmh' | 'sample'>;

export type YearRecap = {
  year: number;
  rides: number;
  distanceKm: number;
  durationSec: number;
  /** Different calendar days with at least one ride. */
  daysRidden: number;
  longest: { name: string; distanceKm: number } | null;
  topSpeedKmh: number;
  /** The month with the most distance, or null when the year has no distance. */
  busiestMonth: { name: string; distanceKm: number } | null;
  averageKm: number;
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const yearOf = (r: RecapRide) => new Date(r.startedAt).getFullYear();
const tenth = (n: number) => +n.toFixed(1);
/** The rider's own rides: the sample ride that comes with the app is not theirs. */
const real = (rides: RecapRide[]) => rides.filter((r) => !r.sample);

/** The calendar years the rider has rides in, on their own clock, newest first. */
export function yearsWithRides(rides: RecapRide[]): number[] {
  return [...new Set(real(rides).map(yearOf))].sort((a, b) => b - a);
}

/** What a rider rode in one calendar year (local time), from the rides in their log. */
export function yearRecap(rides: RecapRide[], year: number): YearRecap {
  const mine = real(rides).filter((r) => yearOf(r) === year);
  const distanceKm = tenth(mine.reduce((n, r) => n + r.distanceKm, 0));
  const byMonth = new Array<number>(12).fill(0);
  for (const r of mine) byMonth[new Date(r.startedAt).getMonth()]! += r.distanceKm;
  const top = byMonth.reduce((best, km, m) => (km > byMonth[best]! ? m : best), 0);
  const longest = mine.reduce<RecapRide | null>((best, r) => (!best || r.distanceKm > best.distanceKm ? r : best), null);
  return {
    year,
    rides: mine.length,
    distanceKm,
    durationSec: mine.reduce((n, r) => n + r.durationSec, 0),
    daysRidden: new Set(mine.map((r) => toISO(new Date(r.startedAt)))).size,
    longest: longest ? { name: longest.name, distanceKm: longest.distanceKm } : null,
    topSpeedKmh: Math.round(Math.max(0, ...mine.map((r) => r.maxKmh))),
    busiestMonth: distanceKm > 0 ? { name: MONTHS[top]!, distanceKm: tenth(byMonth[top]!) } : null,
    averageKm: mine.length ? tenth(distanceKm / mine.length) : 0,
  };
}
