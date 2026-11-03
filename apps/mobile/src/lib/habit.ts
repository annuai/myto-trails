import { clockLabel } from './community';
import { addDays, toISO } from './dates';
import type { Reminder } from './reminders';

/** A time of day the rider keeps coming back to. `startMin` is minutes after midnight, `weekdays` are 0 (Sunday) to 6, `days` is how many different days it was seen on. */
export type Habit = { startMin: number; weekdays: number[]; days: number };
type Started = { startedAt: number; sample?: boolean };

const LOOKBACK_DAYS = 21;
/** Rides on this many different days, starting within WINDOW_MIN of each other, make a habit. */
const MIN_DAYS = 3;
const WINDOW_MIN = 45;
/** A rider has a few regular times at most (out and back, say); more would be noise. */
const MAX_HABITS = 3;
/** How many days ahead to plan: the plan is rebuilt whenever the app opens, so a week is enough. */
const AHEAD_DAYS = 7;
/** A ride this far outside a habit's window still counts as having ridden at that time. */
const SLACK_MIN = 60;
const MIN = 60_000;

const minuteOfDay = (t: number) => { const d = new Date(t); return d.getHours() * 60 + d.getMinutes(); };

/**
 * The times of day the rider keeps setting off, soonest first, from the last three weeks of rides. Starts need not be at the same minute: any
 * 45-minute window with rides on three or more different days counts. The window with the most days is taken first, its rides are set aside,
 * and the search goes on, so a commute (out in the morning, back in the evening) gives two habits, each with its own weekdays.
 */
export function findHabits(rides: Started[], now: number): Habit[] {
  const since = now - LOOKBACK_DAYS * 86_400_000;
  let seen = rides.filter((r) => !r.sample && r.startedAt >= since && r.startedAt <= now).map((r) => ({ iso: toISO(new Date(r.startedAt)), min: minuteOfDay(r.startedAt), weekday: new Date(r.startedAt).getDay() }));
  const out: Habit[] = [];
  while (out.length < MAX_HABITS) {
    let best: { startMin: number; days: Map<string, number> } | undefined;
    for (const from of new Set(seen.map((s) => s.min))) {
      const days = new Map<string, number>();
      for (const s of seen) if (s.min >= from && s.min <= from + WINDOW_MIN) days.set(s.iso, s.weekday);
      if (days.size >= MIN_DAYS && (!best || days.size > best.days.size || (days.size === best.days.size && from < best.startMin))) best = { startMin: from, days };
    }
    if (!best) break;
    out.push({ startMin: best.startMin, weekdays: [...new Set(best.days.values())], days: best.days.size });
    const { startMin } = best;
    seen = seen.filter((s) => s.min < startMin || s.min > startMin + WINDOW_MIN);
  }
  return out.sort((x, y) => x.startMin - y.startMin);
}

/**
 * "Ready for your next ride?" 10 minutes before each of the rider's usual start times, on the weekdays they ride then, for the next week.
 * Not for a time that has passed, and not when they have already ridden around that time that day (a morning ride does not silence the
 * evening one). Nothing here is quiet-hours aware: the time is the rider's own, even at 6 am.
 */
export function habitReminders(rides: Started[], now: number, leadMin = 10): Reminder[] {
  const today = toISO(new Date(now));
  const real = rides.filter((r) => !r.sample && r.startedAt <= now);
  const out: Reminder[] = [];
  for (const habit of findHabits(rides, now)) {
    for (let i = 0; i <= AHEAD_DAYS; i++) {
      const iso = addDays(today, i);
      const [y, m, d] = iso.split('-').map(Number);
      if (!habit.weekdays.includes(new Date(y, m - 1, d).getDay())) continue;
      const fireAt = new Date(y, m - 1, d, 0, habit.startMin).getTime() - leadMin * MIN;
      const ridden = real.some((r) => toISO(new Date(r.startedAt)) === iso && minuteOfDay(r.startedAt) >= habit.startMin - SLACK_MIN && minuteOfDay(r.startedAt) <= habit.startMin + WINDOW_MIN + SLACK_MIN);
      if (fireAt > now && !ridden) out.push({ id: `habit:${iso}:${habit.startMin}`, fireAt, title: 'Ready for your next ride?', body: `You usually ride around ${clockLabel(habit.startMin)}`, lock: 'Time for your ride?', route: '/ride', kind: 'ride' });
    }
  }
  return out.sort((x, y) => x.fireAt - y.fireAt);
}
