import type { NotificationsState } from '@/store/notificationsCore';
import { planReminders, serviceKmReminders, type PlanInput, type Reminder } from './reminders';
import { createSerial } from './serial';

/** What the phone is told to show. */
export type Shown = { id: string; fireAt: number; title: string; body: string; route: string; /** Play the phone's notification sound (and so its vibration): for something the rider must notice while riding. */ loud?: boolean; /** A ride alarm ring: Snooze and I'm up buttons, time-sensitive. */ alarm?: { group: string; snooze: boolean } };
export type Permission = 'granted' | 'denied' | 'undetermined';

/** The phone's notification service. The only part that touches the native module (see notifier.ts). */
export type Notifier = {
  permission(): Promise<Permission>;
  /** Asks the system. Resolves true when granted. */
  request(): Promise<boolean>;
  cancelAll(): Promise<void>;
  schedule(n: Shown): Promise<void>;
  notifyNow(n: Shown): Promise<void>;
  /** Takes one notification away, shown or still waiting (the auto-end warning, once the rider rides off). */
  dismiss?(id: string): Promise<void>;
  openSettings(): void;
};

/** What the plan is built from, read fresh on every sync. */
export type World = Pick<PlanInput, 'todos' | 'appKm' | 'trip' | 'paused' | 'rides' | 'lastCheckAt'> & { /** When Pillion was first met. */ pillionSince?: number };

/** iOS keeps at most 64 pending local notifications; the soonest 60 are scheduled and the rest are picked up at the next sync. */
export const MAX_SCHEDULED = 60;
export const HIDDEN_TITLE = 'Myto Moto reminder';

// An alarm the rider set always says what it is about: hidden, it could not warn about the sunrise.
const shown = (r: Reminder, showDetails: boolean): Shown => (r.alarm
  ? { id: r.id, fireAt: r.fireAt, title: r.title, body: r.body, route: r.route, loud: true, alarm: r.alarm }
  : { id: r.id, fireAt: r.fireAt, title: showDetails ? r.title : HIDDEN_TITLE, body: showDetails ? r.body : r.lock, route: r.route });

/**
 * Rebuilds the schedule from what the rider has now, so it is always right: finished to-dos, a moved date, a cancelled trip or a restored
 * backup all just change the input. Syncs run one at a time.
 */
export function createSyncer(deps: { now: () => number; world: () => World; store: { getState: () => NotificationsState }; notifier: Notifier; /** Ride nudges to add to the plan, given the other reminders so they keep clear of them. */ nudges?: (now: number, others: Reminder[]) => Reminder[]; /** Ride alarm rings to send as notifications, and the reminders they stand in for. */ alarms?: (now: number) => Promise<{ add: Reminder[]; drop: string[] }> }) {
  const serial = createSerial();
  const run = async () => {
    const { store, notifier } = deps;
    const now = deps.now();
    store.getState().absorb(now);
    const { prefs, kmNotified, inbox } = store.getState();
    const world = deps.world();
    const allowed = (await notifier.permission()) === 'granted';
    // The reminders that already came due are in the inbox: the last check one holds back the next for a week.
    const lastCheckReminderAt = inbox.filter((n) => n.id.startsWith('check:')).reduce((m, n) => Math.max(m, n.at), 0) || undefined;
    // Pillion's notifications are in the inbox once they came due: the last holds the next back a week, and "waiting" ones since the last ride are counted.
    const lastRideAt = (world.rides ?? []).filter((r) => !r.sample && !r.simulated).reduce((m, r) => Math.max(m, r.startedAt), 0);
    const pillionSeen = inbox.filter((n) => n.id.startsWith('pillion:'));
    const pillion = { since: world.pillionSince, lastAt: pillionSeen.reduce((m, n) => Math.max(m, n.at), 0) || undefined, waited: pillionSeen.filter((n) => n.id.startsWith('pillion:waiting') && n.at > lastRideAt).length };
    const alarms = deps.alarms ? await deps.alarms(now) : { add: [], drop: [] };
    const base = planReminders({ ...world, now, prefs, lastCheckReminderAt, pillion }).filter((r) => !alarms.drop.includes(r.id));
    const planned = [...base, ...(deps.nudges ? deps.nudges(now, [...base, ...alarms.add]) : []), ...alarms.add].sort((a, b) => a.fireAt - b.fireAt);

    for (const r of serviceKmReminders(world.todos, world.appKm, kmNotified, now, prefs)) {
      const cut = r.id.lastIndexOf(':');
      store.getState().push(r, now);
      store.getState().markKmNotified(r.id.slice(r.id.indexOf(':') + 1, cut), Number(r.id.slice(cut + 1)));
      if (allowed) await notifier.notifyNow(shown(r, prefs.showDetails));
    }
    if (allowed) {
      await notifier.cancelAll();
      for (const r of planned.slice(0, MAX_SCHEDULED)) await notifier.schedule(shown(r, prefs.showDetails));
    }
    store.getState().setScheduled(planned);
  };
  return { sync: () => serial(run) };
}
