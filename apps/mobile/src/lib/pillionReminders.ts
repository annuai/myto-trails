import type { Reminder } from './reminders';

const DAY = 86_400_000;
const HOUR = 3_600_000;
/** Pillion sends at most one notification a week, and never more than this many "waiting" ones in a row without a ride in between. */
export const WEEK_MS = 7 * DAY;
export const WAIT_DAYS = 7;
const LONG_RIDE_SEC = 3 * 3600;
const MAX_WAITS = 2;
/** Nothing before 9:00 or from 20:00 (Pillion is not a night owl); anything outside that waits for 9:30 the next morning. */
const at = (t: number): number => {
  const d = new Date(t);
  const h = d.getHours();
  if (h >= 9 && h < 20) return t;
  const next = new Date(t);
  if (h >= 20) next.setDate(next.getDate() + 1);
  next.setHours(9, 30, 0, 0);
  return next.getTime();
};

type Ridden = { startedAt: number; durationSec?: number; sample?: boolean; simulated?: boolean };

export type PillionPlanInput = {
  now: number;
  rides: Ridden[];
  /** When Pillion was first met (the first open), so a rider who has never ridden is still waited for. */
  since?: number;
  /** When the last Pillion notification came due (they are in the inbox). */
  lastAt?: number;
  /** How many "waiting" notifications have come since the last ride. */
  waited: number;
};

/**
 * Pillion's notifications: at most one in the plan, at most one a week. After a long ride (3 hours or more) he is resting, the same day
 * or the next morning; after about a week without a ride he is waiting, and after two of those without an answer he stops. Opening
 * either shows the matching visit (`/pillion?visit=...`). Pure: it depends only on its input.
 */
export function pillionReminders(i: PillionPlanInput): Reminder[] {
  const real = i.rides.filter((r) => !r.sample && !r.simulated);
  const last = real.reduce<Ridden | undefined>((m, r) => (!m || r.startedAt > m.startedAt ? r : m), undefined);
  const earliest = i.lastAt ? i.lastAt + WEEK_MS : 0;
  const lock = 'Pillion has something to show you';
  if (last && (last.durationSec ?? 0) >= LONG_RIDE_SEC) {
    const end = last.startedAt + (last.durationSec ?? 0) * 1000;
    if (i.now - end < DAY) {
      const fireAt = at(Math.max(end + 1.5 * HOUR, earliest, i.now + 60_000));
      return [{ id: `pillion:rest:${last.startedAt}`, fireAt, title: 'Pillion is taking a rest', body: 'That was a long ride. A stretch and some water sound good.', lock, route: '/pillion?visit=rest', kind: 'pillion' }];
    }
  }
  const ref = last?.startedAt ?? i.since;
  if (ref === undefined || i.waited >= MAX_WAITS) return [];
  const fireAt = at(Math.max(ref + WAIT_DAYS * DAY, earliest, i.now + 60_000));
  return [{ id: `pillion:waiting:${ref}:${i.waited}`, fireAt, title: 'Pillion is waiting', body: 'No rush. The bike and I are right here.', lock, route: '/pillion?visit=waiting', kind: 'pillion' }];
}
