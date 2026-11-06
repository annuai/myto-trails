import { at } from './time';
import type { NudgeWorld } from './types';

/** A Friday morning in November, to build test riders from. */
export const FRIDAY = new Date(2026, 10, 6, 10, 0).getTime();

export const ride = (now: number, daysAgo: number, h = 7, km = 40) => {
  const startedAt = at(now, -daysAgo, h);
  return { startedAt, endedAt: startedAt + 90 * 60_000, distanceKm: km };
};

export const world = (over: Partial<NudgeWorld> = {}): NudgeWorld => ({
  now: FRIDAY, level: 'occasional', muted: [], firstSeenAt: at(FRIDAY, -30, 12), rides: [ride(FRIDAY, 3)], yearKm: 300, usualWeekdays: [], forecast: [], clubRides: [], clubs: 0,
  history: [], others: [], tripDays: [], ...over,
});
