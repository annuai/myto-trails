import type { Candidate } from './candidates';
import { DAY, HOUR, minuteOfDay, sameDay } from './time';
import { NUDGE_META, type NudgeLevel, type NudgeType, type NudgeWorld } from './types';

/** Nudges go out between 08:00 and 21:00 only. */
export const SEND_FROM_MIN = 8 * 60;
export const SEND_TO_MIN = 21 * 60;
/** A nudge keeps this far from any other reminder, so two never arrive together. */
export const SPACING_MS = 3 * HOUR;
/** The least time between two "ride" nudges: about one a week, or two a week for Regular. Half as many again when the rider is not opening them. */
export const GAP_DAYS: Record<Exclude<NudgeLevel, 'off'>, number> = { occasional: 7, regular: 3.5 };
/** An "after a ride" nudge (photos) comes at most this often. */
export const AFTER_GAP_DAYS = 4;
/** A day with the rider's usual-time reminder already needs no nudge. */
const isUsualTimeReminder = (id: string) => id.startsWith('habit:') || id.startsWith('check:habit:');

type Placed = { type: NudgeType; fireAt: number };

/**
 * Whether one more nudge may be shown, given what has been shown and what is already accepted. Hard rules, never weighed against a score:
 * the sending window, one a day, spacing from other reminders, the gap between "ride" nudges, and the gap between "after" nudges.
 */
export function admits(c: Candidate, accepted: Placed[], w: NudgeWorld, tired: boolean): boolean {
  if (w.level === 'off') return false;
  const m = minuteOfDay(c.fireAt);
  if (m < SEND_FROM_MIN || m >= SEND_TO_MIN) return false;
  const placed: Placed[] = [...w.history, ...accepted];
  if (placed.some((p) => sameDay(p.fireAt, c.fireAt))) return false;
  if (w.others.some((o) => Math.abs(o.fireAt - c.fireAt) < SPACING_MS)) return false;
  const cls = NUDGE_META[c.type].cls;
  if (cls === 'ride') {
    if (w.others.some((o) => isUsualTimeReminder(o.id) && sameDay(o.fireAt, c.fireAt))) return false;
    const gap = GAP_DAYS[w.level] * (tired ? 2 : 1) * DAY;
    return !placed.some((p) => NUDGE_META[p.type].cls === 'ride' && Math.abs(p.fireAt - c.fireAt) < gap);
  }
  return !placed.some((p) => NUDGE_META[p.type].cls === 'after' && Math.abs(p.fireAt - c.fireAt) < AFTER_GAP_DAYS * DAY);
}
