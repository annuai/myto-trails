import { addDays, addMonths } from './dates';
import type { Todo } from './todos';

/** What the rider has switched on. */
export type ReminderPrefs = { todos: boolean; trips: boolean; paused: boolean };

/** One notification the app wants to show. `title` and `body` are the full text; `lock` is what shows when details are hidden. */
export type Reminder = { id: string; fireAt: number; title: string; body: string; lock: string; route: string; kind: 'todo' | 'trip' | 'ride' };

export type PlanInput = {
  now: number; todos: Todo[]; appKm: number; prefs: ReminderPrefs;
  /** The planned trip. `iso` is its date (YYYY-MM-DD); a trip with no date (the rider chose "Ride this trail") gets no reminders. */
  trip?: { slug: string; name: string; iso?: string; /** Where a tap on its notification goes. Defaults to the trail page for `slug`. */ route?: string; /** Set for a planned trip: its pack to-dos are counted, and each of its days gets a morning reminder. */ tripId?: string; days?: { iso: string; title: string }[] };
  /** Set while a ride recording is paused. */
  paused?: { since: number };
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

function tripReminders(trip: NonNullable<PlanInput['trip']>, todos: Todo[]): Reminder[] {
  const route = trip.route ?? `/trail/${trip.slug}`;
  if (!trip.iso) return [];
  const packs = todos.filter((t) => t.category === 'pack' && (trip.tripId ? t.tripId === trip.tripId : !t.tripId));
  const left = packs.filter((t) => !t.done).length;
  const body = !packs.length ? 'Check your list before you go' : left ? `${left} of ${packs.length} things still to pack` : 'All packed';
  const eve: Reminder = { id: `trip:${trip.slug}:${trip.iso}:eve`, fireAt: at(addDays(trip.iso, -1), 21), title: `Tomorrow: ${trip.name}`, body, lock: 'You have a ride planned tomorrow', route, kind: 'trip' };
  // One morning reminder for each day of a trip with days; a plain planned trail has just the one.
  const mornings: Reminder[] = trip.days?.length
    ? trip.days.map((d, i) => ({ id: `trip:${trip.slug}:${trip.iso}:day${i}`, fireAt: at(d.iso, 7, 30), title: trip.days!.length > 1 ? `Day ${i + 1} of ${trip.days!.length}: ${trip.name}` : `Ride day: ${trip.name}`, body: d.title, lock: 'You have a ride planned today', route, kind: 'trip' as const }))
    : [{ id: `trip:${trip.slug}:${trip.iso}:day`, fireAt: at(trip.iso, 7, 30), title: `Ride day: ${trip.name}`, body: 'Have a safe one', lock: 'You have a ride planned today', route, kind: 'trip' as const }];
  return [eve, ...mornings];
}

/** Every reminder that should be scheduled from now on, soonest first. Pure: it depends only on its input. */
export function planReminders(i: PlanInput): Reminder[] {
  const all: Reminder[] = [];
  if (i.prefs.todos) all.push(...todoReminders(i.todos));
  if (i.prefs.trips && i.trip) all.push(...tripReminders(i.trip, i.todos));
  if (i.prefs.paused && i.paused) {
    const fireAt = i.paused.since + PAUSE_REMINDER_MS;
    if (!quiet(fireAt)) all.push({ id: `ride:paused:${i.paused.since}`, fireAt, title: 'Your ride is paused', body: 'Resume it or finish it so it is not lost', lock: 'Your ride is paused', route: '/ride/live', kind: 'ride' });
  }
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
