import { isStale, type GroupRiderView, type RiderTile } from './groupCore';

/**
 * Passing the lead of a group ride: the pure rules. "Pass the lead" is the rider's own wording: a rider takes the lead and passes it on.
 */

/** At these levels a leader is warned, then asked who should lead if the phone turns off. */
export const BATTERY_WARN_PCT = 15;
export const BATTERY_WARN2_PCT = 7;
export const BATTERY_ASK_PCT = 5;
/** A phone back above this, or charging, starts the warnings afresh. */
const BATTERY_RESET_PCT = 20;

export type BatteryStage = 'none' | 'low' | 'lower' | 'ask';
const ORDER: BatteryStage[] = ['none', 'low', 'lower', 'ask'];

/**
 * Which warning a leader's battery has reached, and only when it is new: each of the three (15%, 7%, 5%) is raised once as the level falls.
 * Charging, or back above 20%, forgets them. `level` is 0 to 100, or null when the phone does not say.
 */
export function batteryStep(prev: BatteryStage, level: number | null, charging: boolean): { next: BatteryStage; raise: BatteryStage | null } {
  if (level === null) return { next: prev, raise: null };
  if (charging || level > BATTERY_RESET_PCT) return { next: 'none', raise: null };
  const reached: BatteryStage = level <= BATTERY_ASK_PCT ? 'ask' : level <= BATTERY_WARN2_PCT ? 'lower' : level <= BATTERY_WARN_PCT ? 'low' : 'none';
  return ORDER.indexOf(reached) > ORDER.indexOf(prev) ? { next: reached, raise: reached } : { next: prev, raise: null };
}

/**
 * The rider to suggest as the next leader: the leader's backup if they named one, else a marshal, else a captain, else the nearest rider who
 * has been heard from lately. `tiles` leave out you. Undefined when there is nobody.
 */
export function suggestSuccessor(tiles: RiderTile[], successorId?: string | null): RiderTile | undefined {
  const others = tiles.filter((t) => !t.isMe);
  const heard = others.filter((t) => !t.stale);
  return others.find((t) => t.id === successorId)
    ?? heard.find((t) => t.titles.includes('marshal'))
    ?? heard.find((t) => t.titles.includes('captain'))
    ?? [...heard].sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity))[0];
}

/** The riders in the order to offer them as the next leader: the suggested one first, then the rest as they were. */
export function leadCandidates(tiles: RiderTile[], successorId?: string | null): RiderTile[] {
  const first = suggestSuccessor(tiles, successorId);
  const others = tiles.filter((t) => !t.isMe);
  return first ? [first, ...others.filter((t) => t.id !== first.id)] : others;
}

const leaderOf = (rs: GroupRiderView[]) => rs.find((r) => r.role === 'leader');

/**
 * What to tell the group when the lead has changed hands between two looks at it, or nothing. Everyone is told, so no rider is left wondering who
 * to follow. When the old leader has stopped reporting, it says they dropped off, not only who leads now.
 */
export function leadNotice(before: GroupRiderView[], after: GroupRiderView[], meId: string | undefined, now: number): { title: string; body: string } | null {
  const was = leaderOf(before), is = leaderOf(after);
  if (!was || !is || was.id === is.id) return null;
  if (is.id === meId) return { title: 'Group ride', body: 'You now lead the group.' };
  const gone = after.find((r) => r.id === was.id);
  return { title: 'Group ride', body: gone && isStale(gone, now) ? `${was.name} dropped off. ${is.name} now leads.` : `${is.name} now leads.` };
}

/** The words for the three battery warnings, for the leader. */
export const BATTERY_WORDS: Record<Exclude<BatteryStage, 'none'>, (pct: number) => string> = {
  low: (p) => `Battery low (${p}%). If your phone turns off, the group will need someone to lead.`,
  lower: (p) => `Battery at ${p}%. Choose who leads if your phone turns off.`,
  ask: (p) => `Battery at ${p}%. Who should lead if your phone turns off?`,
};
