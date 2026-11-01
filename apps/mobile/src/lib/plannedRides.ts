import { addDays, fromISO, toISO } from './dates';
import { clockLabel } from './community';
import { dayDate, DEFAULT_START_TIME, type Schedule } from './tripPlan';

/** Riders start late, so a planned ride is still offered this long after its start time if it was never started. */
export const LATE_WINDOW_MIN = 12 * 60;
/** Within this many minutes either side of the start time it reads as "Starting now", not as early or late. */
export const NOW_WINDOW_MIN = 5;

type PlannedTrip = Schedule & { id: string; startDate?: string; days?: unknown[]; rideIds: string[]; startTime?: number };
export type PlannedSlot<T extends PlannedTrip> = { trip: T; dayIndex: number; date: string; at: number; /** Minutes since the planned start: negative before it, positive after. */ sinceMin: number };

/**
 * The planned rides to offer on the Ride screen: each day of a trip that falls today (or yesterday, for a start time that was late
 * last night) and has not been ridden, from 'not yet' to up to 12 hours after its start time. Closest to the current time first.
 * `rideStarts` are when the rides on each trip started, so a later day of a trip that is under way counts as ridden by its own ride.
 */
export function plannedSlots<T extends PlannedTrip>(trips: T[], rideStarts: ReadonlyMap<string, number[]>, now: number = Date.now()): PlannedSlot<T>[] {
  const today = toISO(new Date(now));
  const out: PlannedSlot<T>[] = [];
  for (const trip of trips) {
    if (!trip.startDate || trip.endedAt) continue;
    const days = Math.max(1, trip.days?.length ?? 1);
    const starts = (rideStarts.get(trip.id) ?? []).map((t) => toISO(new Date(t)));
    for (let i = 0; i < days; i++) {
      const date = dayDate(trip.startDate, i);
      if (date !== today && date !== addDays(today, -1)) continue;
      if ((i === 0 && trip.startedAt) || starts.includes(date)) continue;
      const base = fromISO(date);
      const at = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, trip.startTime ?? DEFAULT_START_TIME).getTime();
      const sinceMin = Math.round((now - at) / 60_000);
      if (sinceMin > LATE_WINDOW_MIN || (date !== today && sinceMin < 0)) continue;
      out.push({ trip, dayIndex: i, date, at, sinceMin });
    }
  }
  return out.sort((a, b) => Math.abs(a.sinceMin) - Math.abs(b.sinceMin));
}

const span = (min: number) => { const m = Math.abs(min); return m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.floor(m / 60)} h`; };

/** What the card says about the time: a fact, not a scolding. "Starts 7:00 AM · in 25 min", "Starting now", "Planned for 7:00 AM · 40 min ago". */
export function slotTimeText(sinceMin: number, startTime: number): string {
  const at = clockLabel(startTime);
  if (Math.abs(sinceMin) <= NOW_WINDOW_MIN) return `Starting now · ${at}`;
  return sinceMin < 0 ? `Starts ${at} · in ${span(sinceMin)}` : `Planned for ${at} · ${span(sinceMin)} ago`;
}
