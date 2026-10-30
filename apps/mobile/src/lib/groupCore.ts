import { haversine } from './geo';
import { shortDistanceM, withUnit } from './units';

export type GroupStatus = 'ok' | 'wait_up' | 'fuel' | 'break' | 'help';
export type GroupRiderView = { id: string; name: string; role: string; lat: number | null; lng: number | null; /** ISO instant of the last position, null when none. */ at: string | null; status: GroupStatus };

/** A rider whose last position is older than this is shown as "not seen". */
export const STALE_MS = 2 * 60_000;

export const STATUS_LABEL: Record<GroupStatus, string> = { ok: 'All good', wait_up: 'Wait up', fuel: 'Fuel stop', break: 'Break', help: 'Needs help' };

const ageOf = (r: GroupRiderView, now: number) => (r.at ? now - Date.parse(r.at) : Infinity);

/** True when there is no position, or it is more than two minutes old. */
export const isStale = (r: GroupRiderView, now: number): boolean => r.lat == null || r.lng == null || ageOf(r, now) > STALE_MS;

/** Who needs help first, then the leader, then you, then the others by name. */
export function sortRiders(riders: GroupRiderView[], meId: string): GroupRiderView[] {
  const rank = (r: GroupRiderView) => (r.status === 'help' ? 0 : r.role === 'leader' ? 1 : r.id === meId ? 2 : 3);
  return [...riders].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/** Straight-line metres from you to the leader. Null when either has no position, or you are the leader. */
export function distanceToLeaderM(riders: GroupRiderView[], meId: string): number | null {
  const me = riders.find((r) => r.id === meId), leader = riders.find((r) => r.role === 'leader');
  if (!me || !leader || me.id === leader.id || me.lat == null || me.lng == null || leader.lat == null || leader.lng == null) return null;
  return haversine({ lat: me.lat, lng: me.lng }, { lat: leader.lat, lng: leader.lng });
}

/**
 * How often to call `sync`: every 20 seconds while riding, a little slower when stopped or with the app in the background, and
 * quickly (5 s) when someone has called for help. The server takes a write every 5 s, so this is well inside it. A 10-rider group
 * costs about 1,800 requests an hour: enough for a few hundred group-hours a month on a free hosting plan.
 */
export const POLL_MOVING_MS = 20_000;
export function pollIntervalMs(s: { moving: boolean; anyHelp: boolean; backgrounded?: boolean }): number {
  if (s.anyHelp) return 5_000;
  if (s.backgrounded) return s.moving ? 30_000 : 60_000;
  return s.moving ? POLL_MOVING_MS : 30_000;
}

export type SignalChange = { rider: GroupRiderView; from: GroupStatus; to: GroupStatus };

/**
 * Who changed their signal between two looks at the group, other than you. A rider who was not in the earlier look is new, not a
 * change, so joining a group that already has signals up does not fire a notification for each of them.
 */
export function signalChanges(before: GroupRiderView[], after: GroupRiderView[], meId: string | undefined): SignalChange[] {
  const was = new Map(before.map((r) => [r.id, r.status]));
  return after.flatMap((rider) => {
    const from = was.get(rider.id);
    return from !== undefined && rider.id !== meId && from !== rider.status ? [{ rider, from, to: rider.status }] : [];
  });
}

const SIGNAL_TEXT: Record<GroupStatus, string> = {
  ok: 'is all good',
  wait_up: 'says wait up',
  fuel: 'needs a fuel stop',
  break: 'is taking a break',
  help: 'is asking for help',
};

/**
 * What the notification says, for example "Annuai is asking for help". Going back to all good is only worth a message after help
 * (it settles the worry); a change between the other signals is news by itself.
 */
export function signalNotice(c: SignalChange): { title: string; body: string } | null {
  if (c.to === 'ok' && c.from !== 'help') return null;
  const body = c.to === 'ok' ? `${c.rider.name} is OK now` : `${c.rider.name} ${SIGNAL_TEXT[c.to]}`;
  return { title: c.to === 'help' ? 'Group ride: help needed' : 'Group ride', body };
}

export type RiderTile = { id: string; name: string; isMe: boolean; role: string; status: GroupStatus; /** "350 m" or "1.2 km" (miles and feet in miles mode) from you; null without both positions. */ distance: string | null; /** "just now", "40 s ago", "3 min ago", or "not seen yet". */ seen: string; stale: boolean; position: { lat: number; lng: number } | null };

const distanceText = (m: number) => withUnit(shortDistanceM(m));
const seenText = (r: GroupRiderView, now: number) => {
  if (r.lat == null || r.lng == null || !r.at) return 'not seen yet';
  const s = Math.max(0, Math.round((now - Date.parse(r.at)) / 1000));
  return s < 30 ? 'just now' : s < 60 ? `${s} s ago` : `${Math.round(s / 60)} min ago`;
};

/** What each rider's tile shows: who, how far from you, whether they asked for anything, and how fresh the position is. You come last, and a rider who needs help comes first. */
export function riderTiles(riders: GroupRiderView[], meId: string | undefined, here: { lat: number; lng: number } | undefined, now: number): RiderTile[] {
  return sortRiders(riders, meId ?? '').map((r) => {
    const position = r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null;
    return { id: r.id, name: r.name, isMe: r.id === meId, role: r.role, status: r.status, distance: position && here && r.id !== meId ? distanceText(haversine(here, position)) : null, seen: seenText(r, now), stale: isStale(r, now), position };
  }).sort((a, b) => Number(a.isMe) - Number(b.isMe));
}
