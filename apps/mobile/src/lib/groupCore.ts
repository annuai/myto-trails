import { haversine } from './geo';
import { shortDistanceM, withUnit } from './units';

export type GroupStatus = 'ok' | 'wait_up' | 'fuel' | 'break' | 'help';
export type RiderTitle = 'captain' | 'marshal' | 'medic' | 'sweep';
/** `titles` are the jobs the leader gave this rider, any number together. An older server sends only `eventRole`, the one job an event gave them. */
export type GroupRiderView = { id: string; name: string; role: string; eventRole?: RiderTitle | null; titles?: RiderTitle[]; lat: number | null; lng: number | null; /** ISO instant of the last position, null when none. */ at: string | null; status: GroupStatus; /** The rider told the group they got home. They stay on the list, with no position. */ home?: boolean };

/** A rider whose last position is older than this is shown as "not seen". */
export const STALE_MS = 2 * 60_000;

export const STATUS_LABEL: Record<GroupStatus, string> = { ok: 'All good', wait_up: 'Wait up', fuel: 'Fuel stop', break: 'Break', help: 'Needs help' };

/** The titles a rider holds, from the list the leader set or else the one job an event gave them. */
export const titlesOf = (r: Pick<GroupRiderView, 'titles' | 'eventRole'>): RiderTitle[] => r.titles ?? (r.eventRole ? [r.eventRole] : []);

const ageOf = (r: GroupRiderView, now: number) => (r.at ? now - Date.parse(r.at) : Infinity);

/** True when there is no position, or it is more than two minutes old. */
export const isStale = (r: GroupRiderView, now: number): boolean => r.lat == null || r.lng == null || ageOf(r, now) > STALE_MS;

/**
 * Which of the group's colours each rider gets: the riders in order of their id, so every phone in the group agrees
 * on who is which colour. More riders than colours wrap round.
 */
export function riderSlots(riders: { id: string }[]): Map<string, number> {
  return new Map([...riders].sort((a, b) => a.id.localeCompare(b.id)).map((r, i) => [r.id, i] as const));
}

/** The order signals come in on screen: a call for help first, then wait up, then a fuel stop, then a break. Nothing asked for is last. */
export const SIGNAL_ORDER: GroupStatus[] = ['help', 'wait_up', 'fuel', 'break'];
const signalRank = (s: GroupStatus): number => { const i = SIGNAL_ORDER.indexOf(s); return i < 0 ? SIGNAL_ORDER.length : i; };

/** Who has asked for something first (help, then wait up, fuel, break), then the leader, then you, then the others by name. */
export function sortRiders(riders: GroupRiderView[], meId: string): GroupRiderView[] {
  const rank = (r: GroupRiderView) => (r.status !== 'ok' ? signalRank(r.status) : SIGNAL_ORDER.length + (r.role === 'leader' ? 0 : r.id === meId ? 1 : 2));
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
 * costs about 1,800 requests an hour: enough for a few hundred group-hours a month on a free hosting plan. A group can hold 100 riders, and every poll
 * carries everyone, so past 30 riders each rider polls half as often (and a call for help is checked every 10 s, not 5): the same load for ten times the people.
 */
export const POLL_MOVING_MS = 20_000;
/** A group bigger than this polls more slowly. */
export const BIG_GROUP = 30;
export function pollIntervalMs(s: { moving: boolean; anyHelp: boolean; backgrounded?: boolean; /** How many riders are in the group. */ riders?: number }): number {
  const big = (s.riders ?? 0) > BIG_GROUP;
  if (s.anyHelp) return big ? 10_000 : 5_000;
  if (s.backgrounded) return (s.moving ? 30_000 : 60_000) * (big ? 1.5 : 1);
  return (s.moving ? POLL_MOVING_MS : 30_000) * (big ? 1.5 : 1);
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

export type RiderTile = { /** Told the group they got home. */ home?: boolean; id: string; name: string; /** Which of the group's colours this rider is. */ slot: number; isMe: boolean; role: string; /** The jobs this rider holds, any number. */ titles: RiderTitle[]; status: GroupStatus; /** The same in metres, for ordering; null without both positions. */ distanceM: number | null; /** "350 m" or "1.2 km" (miles and feet in miles mode) from you; null without both positions. */ distance: string | null; /** "just now", "40 s ago", "3 min ago", or "not seen yet". */ seen: string; stale: boolean; position: { lat: number; lng: number } | null };

const distanceText = (m: number) => withUnit(shortDistanceM(m));
const seenText = (r: GroupRiderView, now: number) => {
  if (r.home) return 'home';
  if (r.lat == null || r.lng == null || !r.at) return 'not seen yet';
  const s = Math.max(0, Math.round((now - Date.parse(r.at)) / 1000));
  return s < 30 ? 'just now' : s < 60 ? `${s} s ago` : `${Math.round(s / 60)} min ago`;
};

/** What each rider's tile shows: who, how far from you, whether they asked for anything, and how fresh the position is. You come last, and a rider who needs help comes first. */
export function riderTiles(riders: GroupRiderView[], meId: string | undefined, here: { lat: number; lng: number } | undefined, now: number): RiderTile[] {
  const slots = riderSlots(riders);
  return sortRiders(riders, meId ?? '').map((r) => {
    const position = r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null;
    return { id: r.id, name: r.name, slot: slots.get(r.id) ?? 0, isMe: r.id === meId, role: r.role, titles: titlesOf(r), status: r.status, home: !!r.home, distanceM: position && here && r.id !== meId ? haversine(here, position) : null, distance: position && here && r.id !== meId ? distanceText(haversine(here, position)) : null, seen: seenText(r, now), stale: isStale(r, now), position };
  }).sort((a, b) => Number(a.isMe) - Number(b.isMe));
}

/** How many riders the row under the map names; the rest are behind its "All" chip. */
export const RAIL_MAX = 4;

/**
 * Who the row under the map shows, most important first: a rider calling for help, then one asking the group to wait up, then a fuel stop, then a
 * break; among riders with the same signal, whoever signalled first (`since`, when this phone first saw it). Then the leader, then the nearest.
 * You are not in it (you are the arrow on the map). `total` is everyone in the group, for the "All" chip.
 */
export function railOrder(tiles: RiderTile[], max: number = RAIL_MAX, since: Record<string, number> = {}): { shown: RiderTile[]; total: number } {
  const rank = (t: RiderTile) => (t.status !== 'ok' ? signalRank(t.status) : SIGNAL_ORDER.length + (t.role === 'leader' ? 0 : 1));
  const others = tiles.filter((t) => !t.isMe).sort((a, b) => rank(a) - rank(b) || (since[a.id] ?? Infinity) - (since[b.id] ?? Infinity) || (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity) || a.name.localeCompare(b.name));
  return { shown: others.slice(0, max), total: tiles.length };
}

/** Riders whose name, or a title they hold, contains what was typed (any case); everyone when nothing is typed. */
export function findRiders(tiles: RiderTile[], query: string, titleWords: Record<RiderTitle, string>): RiderTile[] {
  const q = query.trim().toLowerCase();
  if (!q) return tiles;
  return tiles.filter((t) => t.name.toLowerCase().includes(q) || t.titles.some((x) => titleWords[x].toLowerCase().includes(q)) || (t.role === 'leader' && 'leader'.includes(q)));
}

/** A group this big gets a search box above its riders. */
export const SEARCH_FROM = 6;

/** How many of the group have told it they are home, and whether that is all of them (two riders or more: a group of one is not "everyone"). */
export function homeCount(riders: GroupRiderView[]): { home: number; total: number; everyone: boolean } {
  const home = riders.filter((r) => r.home).length;
  return { home, total: riders.length, everyone: riders.length >= 2 && home === riders.length };
}

/** True at the moment the last rider gets home: everyone is home now, and the earlier look had riders but not everyone. Joining a group that is already home is not news. */
export const justEveryoneHome = (before: GroupRiderView[], after: GroupRiderView[]): boolean => before.length > 0 && !homeCount(before).everyone && homeCount(after).everyone;

/** "Everyone's home" for the notification: how many riders, in words. */
export const everyoneHomeText = (riders: number): string => `All ${riders} riders are home safe.`;
