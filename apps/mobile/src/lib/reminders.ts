import { addDays, addMonths } from './dates';
import { habitReminders } from './habit';
import { pillionReminders } from './pillionReminders';
import type { Todo } from './todos';
import { REMIND_BEFORE_MIN } from './tripPlan';

/** What the rider has switched on. */
export type ReminderPrefs = { todos: boolean; trips: boolean; paused: boolean; /** "Ready for your next ride?" before the time of day the rider usually sets off. Off when not set. */ habit?: boolean; /** Minutes before the usual time to send that reminder. Ten when not set. */ habitLeadMin?: number; /** Minutes before a trip starts to be reminded to start it; 0 is off. Ten when not set. */ tripLeadMin?: number; /** A "quick check before you ride" reminder, at most once a week, around a planned trip or a usual ride. Off here when not set; the settings turn it on by default. */ check?: boolean; /** Pillion's "resting" and "waiting" notifications, at most one a week. Off here when not set; the settings turn it on by default. */ pillion?: boolean };

/** One notification the app wants to show. `title` and `body` are the full text; `lock` is what shows when details are hidden. */
export type Reminder = { id: string; fireAt: number; title: string; body: string; lock: string; route: string; kind: 'todo' | 'trip' | 'ride' | 'nudge' | 'pillion' };

export type PlanInput = {
  now: number; todos: Todo[]; appKm: number; prefs: ReminderPrefs;
  /** The planned trip. `iso` is its date (YYYY-MM-DD); a trip with no date (the rider chose "Ride this trail") gets no reminders. */
  trip?: { slug: string; name: string; iso?: string; /** Where a tap on its notification goes. Defaults to the trail page for `slug`. */ route?: string; /** Set for a planned trip: its pack to-dos are counted, and each of its days gets a morning reminder. */ tripId?: string; days?: { iso: string; title: string }[]; /** Minutes after midnight each day starts. With it, a reminder comes 10 minutes before, in place of the 7:30 morning one. */ startTime?: number; /** The rider has pressed Start trip: no "has not started" nudge. */ started?: boolean };
  /** Set while a ride recording is paused. */
  paused?: { since: number };
  /** The rider's past rides, which the "ready for your next ride?" reminder learns their usual time from. */
  rides?: { startedAt: number; sample?: boolean; simulated?: true; durationSec?: number }[];
  /** When the rider last finished a pre-ride check. */
  lastCheckAt?: number;
  /** When a check reminder last came due, so there is never more than one a week. */
  lastCheckReminderAt?: number;
  /** What Pillion needs to plan his notifications: when he was first met, when his last notification came due, and how many "waiting" ones came since the last ride. */
  pillion?: { since?: number; lastAt?: number; waited: number };
};

const PAUSE_REMINDER_MS = 30 * 60_000;
/** Nothing is shown from 21:00 (after) to 07:00 (before). */
const quiet = (t: number) => { const d = new Date(t); const m = d.getHours() * 60 + d.getMinutes(); return m < 7 * 60 || m > 21 * 60; };

/** Local time on a YYYY-MM-DD date. */
const at = (iso: string, h: number, m = 0) => new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), h, m).getTime();

/** The date a to-do runs out: its due date, or a service item's last date plus its months. Without one there is nothing to schedule. */
const dueDate = (t: Todo): string | undefined => (t.kind === 'date' ? t.due : t.lastDate && t.everyMonths ? addMonths(t.lastDate, t.everyMonths) : undefined);

function todoReminders(todos: Todo[]): Reminder[] {
  const out: Reminder[] = [];
  for (const t of todos) {
    const due = dueDate(t);
    // A trip's pack to-dos are covered by the trip's own reminders (one evening-before nudge with the count), not one each.
    if (t.done || !due || t.tripId) continue;
    const steps: [number, string, string][] = [[-1, 'is due tomorrow', 'A to-do is due tomorrow'], [0, 'is due today', 'A to-do is due today'], [1, 'is overdue', 'A to-do is overdue']];
    if (t.category === 'document') steps.unshift([-7, 'is due in a week', 'A to-do is due in a week']);
    for (const [offset, text, lock] of steps) {
      out.push({ id: `todo:${t.id}:${due}:${offset}`, fireAt: at(addDays(due, offset), 9), title: t.title, body: `${t.title} ${text}`, lock, route: '/todos', kind: 'todo' });
    }
  }
  return out;
}

function tripReminders(trip: NonNullable<PlanInput['trip']>, todos: Todo[], leadMin: number): Reminder[] {
  const route = trip.route ?? `/trail/${trip.slug}`;
  if (!trip.iso) return [];
  const packs = todos.filter((t) => t.category === 'pack' && (trip.tripId ? t.tripId === trip.tripId : !t.tripId));
  const left = packs.filter((t) => !t.done).length;
  const body = !packs.length ? 'Check your list before you go' : left ? `${left} of ${packs.length} things still to pack` : 'All packed';
  const eve: Reminder = { id: `trip:${trip.slug}:${trip.iso}:eve`, fireAt: at(addDays(trip.iso, -1), 21), title: `Tomorrow: ${trip.name}`, body, lock: 'You have a ride planned tomorrow', route, kind: 'trip' };
  // A day of a trip with a start time is reminded 10 minutes before it, so the rider opens the app and starts recording; the first
  // day also gets one nudge a quarter of an hour after if the trip has still not been started. Without a start time there is one
  // 7:30 morning reminder per day (a plain planned trail has just the one).
  const MIN = 60_000;
  const mornings: Reminder[] = trip.days?.length
    ? trip.days.flatMap((d, i): Reminder[] => {
        if (trip.startTime === undefined) return [{ id: `trip:${trip.slug}:${trip.iso}:day${i}`, fireAt: at(d.iso, 7, 30), title: trip.days!.length > 1 ? `Day ${i + 1} of ${trip.days!.length}: ${trip.name}` : `Ride day: ${trip.name}`, body: d.title, lock: 'You have a ride planned today', route, kind: 'trip' }];
        // The rider can turn this off in Notifications: no reminder to start, and so no nudge for not starting.
        if (leadMin <= 0) return [];
        const start = at(d.iso, Math.floor(trip.startTime / 60), trip.startTime % 60);
        const pre: Reminder = { id: `trip:${trip.slug}:${trip.iso}:day${i}:pre`, fireAt: start - leadMin * MIN, title: `${trip.name} starts in ${leadMin === 60 ? 'an hour' : `${leadMin} minutes`}`, body: i === 0 ? 'Open Myto Moto and tap Start trip' : `Open Myto Moto and tap Record day ${i + 1}`, lock: 'Your ride starts soon', route, kind: 'trip' };
        const late: Reminder = { id: `trip:${trip.slug}:${trip.iso}:late`, fireAt: start + 15 * MIN, title: `${trip.name} has not started`, body: 'Tap to start it now, or move it to another time', lock: 'Your ride has not started', route, kind: 'trip' };
        return i === 0 && !trip.started ? [pre, late] : [pre];
      })
    : [{ id: `trip:${trip.slug}:${trip.iso}:day`, fireAt: at(trip.iso, 7, 30), title: `Ride day: ${trip.name}`, body: 'Have a safe one', lock: 'You have a ride planned today', route, kind: 'trip' as const }];
  return [eve, ...mornings];
}

/** A check reminder is never closer than this to the last check or the last check reminder. */
export const CHECK_EVERY_MS = 7 * 86_400_000;
const CHECK_LEAD_MIN = 30;
const CHECK_ROUTE = '/fixit/check';

/**
 * The one "quick check before you ride" reminder to schedule, or nothing. It is tied to a ride the rider has told the app about, never to the
 * calendar: 30 minutes before a planned trip starts (the evening before if that falls in quiet hours, 7:00 when the trip has no start time),
 * or folded into the next "Ready for your next ride?" reminder on a day they usually ride. The earliest is taken, and only when the last
 * check, and the last check reminder, were at least a week before it.
 */
function checkReminder(i: PlanInput, habit: Reminder[]): { reminder: Reminder; replaces?: string } | undefined {
  const since = Math.max(i.lastCheckAt ?? 0, i.lastCheckReminderAt ?? 0);
  const out: { reminder: Reminder; replaces?: string }[] = [];
  const trip = i.trip;
  if (trip?.iso && !trip.started) {
    const day = trip.days?.[0]?.iso ?? trip.iso;
    let fireAt = trip.startTime !== undefined ? at(day, Math.floor(trip.startTime / 60), trip.startTime % 60) - CHECK_LEAD_MIN * 60_000 : at(day, 7, 0);
    if (quiet(fireAt)) fireAt = at(addDays(day, -1), 19, 30);
    out.push({ reminder: { id: `check:trip:${trip.slug}:${day}`, fireAt, title: 'Quick check before you ride', body: 'Two minutes: tyres, brakes, chain, lights.', lock: 'A reminder for your bike check', route: CHECK_ROUTE, kind: 'ride' } });
  }
  const h = habit[0];
  if (h) out.push({ replaces: h.id, reminder: { ...h, id: `check:${h.id}`, body: `${h.body}. Two minutes to check the bike first?`, route: CHECK_ROUTE } });
  return out.filter((c) => c.reminder.fireAt > i.now && c.reminder.fireAt - since >= CHECK_EVERY_MS).sort((x, y) => x.reminder.fireAt - y.reminder.fireAt)[0];
}

/** Every reminder that should be scheduled from now on, soonest first. Pure: it depends only on its input. */
export function planReminders(i: PlanInput): Reminder[] {
  const all: Reminder[] = [];
  if (i.prefs.todos) all.push(...todoReminders(i.todos));
  if (i.prefs.trips && i.trip) all.push(...tripReminders(i.trip, i.todos, i.prefs.tripLeadMin ?? REMIND_BEFORE_MIN));
  if (i.prefs.paused && i.paused) {
    const fireAt = i.paused.since + PAUSE_REMINDER_MS;
    if (!quiet(fireAt)) all.push({ id: `ride:paused:${i.paused.since}`, fireAt, title: 'Your ride is paused', body: 'Resume it or finish it so it is not lost', lock: 'Your ride is paused', route: '/ride/live', kind: 'ride' });
  }
  let habit: Reminder[] = [];
  if ((i.prefs.habit || i.prefs.check) && i.rides) {
    // A day with a planned trip already has its own start reminder, so it gets no second one.
    const tripDays = new Set(i.trip ? [i.trip.iso, ...(i.trip.days ?? []).map((d) => d.iso)] : []);
    habit = habitReminders(i.rides, i.now, i.prefs.habitLeadMin).filter((r) => !tripDays.has(r.id.slice(6, 16)));
  }
  const check = i.prefs.check ? checkReminder(i, habit) : undefined;
  if (i.prefs.habit) all.push(...habit.filter((r) => r.id !== check?.replaces));
  if (check) all.push(check.reminder);
  if (i.prefs.pillion && i.rides && i.pillion) all.push(...pillionReminders({ now: i.now, rides: i.rides, ...i.pillion }));
  return all.filter((r) => r.fireAt > i.now).sort((a, b) => a.fireAt - b.fireAt);
}

/**
 * Service items whose distance limit has just passed, to tell the rider now. Distance cannot be scheduled ahead, because it depends on
 * riding that has not happened. `notified` maps a to-do id to the `lastKm` it was told about, so a service is announced once and the
 * next one (after it is marked done) is announced again.
 */
export function serviceKmReminders(todos: Todo[], appKm: number, notified: Record<string, number>, now: number, prefs: ReminderPrefs): Reminder[] {
  if (!prefs.todos) return [];
  return todos
    .filter((t) => t.kind === 'service' && !t.done && t.everyKm && t.everyKm - Math.max(0, appKm - (t.lastKm ?? 0)) <= 0 && notified[t.id] !== (t.lastKm ?? 0))
    .map((t) => ({ id: `svc:${t.id}:${t.lastKm ?? 0}`, fireAt: now, title: `${t.title} is due`, body: `About ${t.everyKm} km since the last one`, lock: 'A service is due', route: '/todos', kind: 'todo' as const }));
}
