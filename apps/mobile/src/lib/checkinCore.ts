// The rules of the safety check-in on the phone: its status over time, and when to send a position.

import { haversine, type LatLng } from './geo';

/** active, due soon, overdue or arrived. */
export type CheckinStatus = 'active' | 'due_soon' | 'overdue' | 'arrived';

/** The last stretch before the expected time, when the rider is reminded to extend or finish. */
export const DUE_SOON_MS = 15 * 60_000;

/** Where a check-in stands. Times are milliseconds; once the rider has arrived nothing else matters. */
export function checkinStatus(now: number, expectedAt: number, arrivedAt?: number | null): CheckinStatus {
  if (arrivedAt != null) return 'arrived';
  if (now >= expectedAt) return 'overdue';
  return expectedAt - now <= DUE_SOON_MS ? 'due_soon' : 'active';
}

/** A position goes to the server about once a minute. The server takes one per 20 s, so a long move is sent that soon and no sooner. */
export const PING_EVERY_MS = 60_000;
/** The least time between positions sent after a long move. */
export const MOVED_PING_MIN_MS = 20_000;
/** How far the rider must move to send a position early. */
export const MOVED_PING_M = 500;

/** The last position sent, and when. */
export type LastPing = { at: number; position: LatLng };

/** Whether to send a position now: always the first, then about once a minute, or sooner after a long move. */
export function shouldPing(now: number, position: LatLng, last: LastPing | null): boolean {
  if (!last) return true;
  const since = now - last.at;
  if (since >= PING_EVERY_MS) return true;
  return since >= MOVED_PING_MIN_MS && haversine(last.position, position) >= MOVED_PING_M;
}
