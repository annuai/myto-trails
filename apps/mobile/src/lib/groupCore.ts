import { haversine } from './geo';

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

/** How often to call `sync`: quickly when someone needs help or the rider is moving, slowly while everyone is stopped. The server takes a write every 5 s. */
export function pollIntervalMs(s: { moving: boolean; anyHelp: boolean; backgrounded?: boolean }): number {
  if (s.anyHelp) return 5_000;
  if (s.backgrounded) return s.moving ? 15_000 : 30_000;
  return s.moving ? 10_000 : 20_000;
}
