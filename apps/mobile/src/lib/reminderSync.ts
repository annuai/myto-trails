import type { NotificationsState } from '@/store/notificationsCore';
import { planReminders, serviceKmReminders, type PlanInput, type Reminder } from './reminders';
import { createSerial } from './serial';

/** What the phone is told to show. */
export type Shown = { id: string; fireAt: number; title: string; body: string; route: string; /** Play the phone's notification sound (and so its vibration): for something the rider must notice while riding. */ loud?: boolean };
export type Permission = 'granted' | 'denied' | 'undetermined';

/** The phone's notification service. The only part that touches the native module (see notifier.ts). */
export type Notifier = {
  permission(): Promise<Permission>;
  /** Asks the system. Resolves true when granted. */
  request(): Promise<boolean>;
  cancelAll(): Promise<void>;
  schedule(n: Shown): Promise<void>;
  notifyNow(n: Shown): Promise<void>;
  openSettings(): void;
};

/** What the plan is built from, read fresh on every sync. */
export type World = Pick<PlanInput, 'todos' | 'appKm' | 'trip' | 'paused'>;

/** iOS keeps at most 64 pending local notifications; the soonest 60 are scheduled and the rest are picked up at the next sync. */
export const MAX_SCHEDULED = 60;
export const HIDDEN_TITLE = 'Myto Moto reminder';

const shown = (r: Reminder, showDetails: boolean): Shown => ({ id: r.id, fireAt: r.fireAt, title: showDetails ? r.title : HIDDEN_TITLE, body: showDetails ? r.body : r.lock, route: r.route });

/**
 * Rebuilds the schedule from what the rider has now, so it is always right: finished to-dos, a moved date, a cancelled trip or a restored
 * backup all just change the input. Syncs run one at a time.
 */
export function createSyncer(deps: { now: () => number; world: () => World; store: { getState: () => NotificationsState }; notifier: Notifier }) {
  const serial = createSerial();
  const run = async () => {
    const { store, notifier } = deps;
    const now = deps.now();
    store.getState().absorb(now);
    const { prefs, kmNotified } = store.getState();
    const world = deps.world();
    const allowed = (await notifier.permission()) === 'granted';
    const planned = planReminders({ ...world, now, prefs });

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
