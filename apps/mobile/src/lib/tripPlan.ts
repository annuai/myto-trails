import { addDays, daysUntil, formatShort, todayISO } from './dates';

/** Where a day of a trip goes: a published trail (kept as it was when chosen) or a route the rider made. */
export type TripRoute =
  | { kind: 'trail'; slug: string; name: string; status: 'good' | 'caution' | 'stop' | 'unknown'; statusLabel: string }
  | { kind: 'mine'; id: string; name: string };
export type TripDay = { id: string; note?: string; route?: TripRoute };

/** A trip with a start date is planned ahead; one without (made before dates existed) is only a record of rides. */
export type TripStatus = 'logged' | 'upcoming' | 'ready' | 'active' | 'done';
export type Schedule = { startDate?: string; days?: unknown[]; startedAt?: number; endedAt?: number };

export const MAX_TRIP_DAYS = 30;
const count = (t: Schedule) => Math.max(1, t.days?.length ?? 1);

export const dayDate = (startDate: string, index: number) => addDays(startDate, index);
export const lastDate = (t: Schedule & { startDate: string }) => addDays(t.startDate, count(t) - 1);

/**
 * Where a trip stands. It starts only when the rider says so: from its first day on it is `ready` (the Start trip button
 * shows), not `active`. A trip that was never started and whose last day has passed is `done`, as is one the rider ended.
 */
export function tripStatus(t: Schedule, today: string = todayISO()): TripStatus {
  if (!t.startDate) return 'logged';
  if (t.endedAt) return 'done';
  const end = lastDate({ ...t, startDate: t.startDate });
  if (today > end) return 'done';
  if (t.startedAt) return 'active';
  return today >= t.startDate ? 'ready' : 'upcoming';
}

/** Which day (0 is the first) a date falls on, clamped to the trip's days. Null for a trip with no start date. */
export function dayIndexOn(t: Schedule, date: string = todayISO()): number | null {
  if (!t.startDate) return null;
  return Math.max(0, Math.min(count(t) - 1, daysUntil(date, t.startDate)));
}

const RANK: Record<TripStatus, number> = { active: 0, ready: 1, upcoming: 2, done: 3, logged: 4 };

/** The trip to show first: one under way, then one ready to start, then the nearest coming up. Finished and undated trips never. */
export function soonestTrip<T extends Schedule>(trips: T[], today: string = todayISO()): T | undefined {
  return trips
    .filter((t) => RANK[tripStatus(t, today)] <= 2)
    .sort((a, b) => RANK[tripStatus(a, today)] - RANK[tripStatus(b, today)] || (a.startDate ?? '').localeCompare(b.startDate ?? ''))[0];
}

/** "Today", "Tomorrow", "In 5 days", or "Day 2 of 4" for a trip under way. */
export function whenText(t: Schedule, today: string = todayISO()): string {
  const s = tripStatus(t, today);
  if (!t.startDate || s === 'logged') return '';
  if (s === 'active') return `Day ${(dayIndexOn(t, today) ?? 0) + 1} of ${count(t)}`;
  if (s === 'done') return 'Finished';
  const d = daysUntil(t.startDate, today);
  return d <= 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`;
}

/** "3 Nov", or "3 to 6 Nov" for a trip of several days. */
export function rangeText(t: Schedule): string {
  if (!t.startDate) return '';
  const end = lastDate({ ...t, startDate: t.startDate });
  return end === t.startDate ? formatShort(t.startDate) : `${formatShort(t.startDate)} to ${formatShort(end)}`;
}

/** The days list resized to `n`, keeping what is on the days that stay. */
export function resizeDays(days: TripDay[] | undefined, n: number, newId: () => string): TripDay[] {
  const keep = (days ?? []).slice(0, Math.max(1, Math.min(MAX_TRIP_DAYS, n)));
  while (keep.length < Math.max(1, Math.min(MAX_TRIP_DAYS, n))) keep.push({ id: newId() });
  return keep;
}

/** Documents whose date runs out before the trip's last day, so the rider can renew them first. */
export function expiringBefore(docs: { label: string; validTill?: string }[], endDate: string): { label: string; validTill: string }[] {
  return docs.flatMap((d) => (d.validTill && d.validTill <= endDate ? [{ label: d.label, validTill: d.validTill }] : []));
}
