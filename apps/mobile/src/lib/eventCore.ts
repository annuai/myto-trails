import { haversine } from './geo';
import { isStale, type GroupRiderView } from './groupCore';
import type { EventRole, RideEventDetail } from '@/api/types';

const HOUR_MS = 3_600_000;
/** Check-in opens an hour before the start and closes six hours after it, as on the server. */
const OPENS_BEFORE_MS = HOUR_MS;
const CLOSES_AFTER_MS = 6 * HOUR_MS;

export const ROLES: EventRole[] = ['captain', 'marshal', 'medic', 'sweep'];
export const ROLE_LABEL: Record<EventRole, string> = { captain: 'Captain', marshal: 'Marshal', medic: 'Medic', sweep: 'Sweep' };
export const roleLabel = (r: EventRole): string => ROLE_LABEL[r];

export type CheckInState = 'yes' | 'early' | 'closed' | 'far' | 'no_fix';

/** Whether the phone should offer "Check in?": inside the time window, with a fix good enough to tell, and inside the radius. */
export function canCheckIn(
  ev: { lat: number; lng: number; radiusM: number; startsAt: string },
  here: { lat: number; lng: number; accuracyM: number } | null,
  now: number,
): CheckInState {
  const t = now - Date.parse(ev.startsAt);
  if (t < -OPENS_BEFORE_MS) return 'early';
  if (t > CLOSES_AFTER_MS) return 'closed';
  if (!here || here.accuracyM > ev.radiusM) return 'no_fix';
  return haversine(ev, here) <= ev.radiusM ? 'yes' : 'far';
}

/**
 * The leader's warning: riders more than `stretchKm` from the leader. Riders not heard from lately are ignored, and so is everyone
 * when the viewer is not the leader or has no position of their own.
 */
export function stretchAlert(riders: GroupRiderView[], meId: string, stretchKm: number, now: number): { names: string[] } | null {
  const leader = riders.find((r) => r.role === 'leader');
  if (!leader || leader.id !== meId || isStale(leader, now)) return null;
  const far = riders.filter((r) => r.id !== meId && !isStale(r, now) && haversine({ lat: leader.lat!, lng: leader.lng! }, { lat: r.lat!, lng: r.lng! }) > stretchKm * 1000);
  return far.length ? { names: far.map((r) => r.name) } : null;
}

export type PrimaryAction = 'join_ride' | 'check_in' | 'going' | 'none';

/** The one thing the event page offers first. Check-in wins over replying once the rider is at the meeting point. */
export function primaryAction(ev: Pick<RideEventDetail, 'status' | 'myResponse' | 'checkedIn' | 'rideLive' | 'mine'>, nearEnough: boolean): PrimaryAction {
  if (ev.status === 'cancelled' || ev.status === 'ended') return 'none';
  if (ev.rideLive && (ev.checkedIn || ev.mine)) return 'join_ride';
  if (ev.myResponse === 'waitlisted') return 'none';
  if (nearEnough) return 'check_in';
  return ev.myResponse === 'going' || ev.mine ? 'none' : 'going';
}
