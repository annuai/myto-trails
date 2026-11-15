/**
 * Ride alarms: the whole run of rings for one ride, worked out when the alarm is set. The phone's alarm code (Android receiver, iOS
 * AlarmKit intent, or plain notifications) only steps through it, so a snooze never needs the app's JavaScript to be running.
 * Pure and tested; see docs/superpowers/specs/2026-11-15-ride-alarms.md.
 */

export const LEAD_CHOICES = [15, 30] as const;
/** A custom lead: 5 minutes to 3 hours, in steps of 5. */
export const CUSTOM_LEAD = { min: 5, max: 180, step: 5, default: 45 } as const;
/** From waking to riding off: the least a rider needs to get geared up. */
export const READY_MIN = 10;
/** Rings for a lead of up to half an hour. */
export const MAX_STEPS = 6;
const SNOOZE_MAX_MIN = 9;
const SNOOZE_MIN_MIN = 3;
/** A sunrise this long before the start up to this long after it is what the ride is timed for. */
const SUNRISE_BEFORE_MIN = 30;
const SUNRISE_AFTER_MIN = 90;
/** A sunset up to this long after the start is what the ride is timed for. */
const SUNSET_AFTER_MIN = 120;
const MIN = 60_000;

/** `auto` lets the ride decide (a sunrise or sunset it is timed for); `start` only ever means the start time. */
export type GoalChoice = 'auto' | 'start';

/** One ride on one day, with what the phone knows about it. */
export type RideContext = {
  /** The alarm group: the setting's key and the day, e.g. `trip:abc:2026-11-16`. */
  id: string;
  title: string;
  startsAt: number;
  /** A club ride: other riders are waiting. */
  group: boolean;
  sun?: { sunriseMs: number; sunsetMs: number };
  weather?: { rainPct: number; maxC: number; minC?: number };
  /** Pack to-dos still open for this ride. */
  packLeft?: number;
};

export type Goal = { kind: 'sunrise' | 'sunset' | 'start'; at: number };

export type AlarmStep = {
  id: string;
  group: string;
  index: number;
  fireAt: number;
  /** Short, because iOS alarms show only this line. */
  title: string;
  body: string;
  /** False on the last ring: no snooze button. */
  snooze: boolean;
  /** The pre-ride screen. */
  route: string;
};

/** What the ride is aimed at: a sunrise or sunset it is timed for, otherwise its start. */
export function pickGoal(c: RideContext, choice: GoalChoice): Goal {
  const start: Goal = { kind: 'start', at: c.startsAt };
  if (choice === 'start' || !c.sun) return start;
  const rise = (c.sun.sunriseMs - c.startsAt) / MIN;
  if (rise >= -SUNRISE_BEFORE_MIN && rise <= SUNRISE_AFTER_MIN) return { kind: 'sunrise', at: c.sun.sunriseMs };
  const set = (c.sun.sunsetMs - c.startsAt) / MIN;
  if (set >= 0 && set <= SUNSET_AFTER_MIN) return { kind: 'sunset', at: c.sun.sunsetMs };
  return start;
}

export const alarmRoute = (group: string) => `/alarm/${encodeURIComponent(group)}`;

/** The context lines for the first ring: the sun, the weather, the pack list. */
function contextLine(c: RideContext, goal: Goal, clock: (ms: number) => string): string {
  const parts: string[] = [];
  if (goal.kind === 'sunrise') parts.push(`Sunrise ${clock(goal.at)}.`);
  if (goal.kind === 'sunset') parts.push(`Sunset ${clock(goal.at)}.`);
  const w = c.weather;
  if (w) {
    if (w.rainPct >= 50) parts.push(`Rain likely (${w.rainPct}%). Pack the liner.`);
    else if (w.minC !== undefined && w.minC <= 8) parts.push(`Cold start, ${Math.round(w.minC)}°. Layer up.`);
    else parts.push(`Dry, ${Math.round(w.maxC)}° later.`);
  }
  if (c.packLeft) parts.push(`${c.packLeft} ${c.packLeft === 1 ? 'thing' : 'things'} still to pack.`);
  return parts.join(' ') || 'Time to gear up.';
}

const inMin = (ms: number) => Math.max(1, Math.round(ms / MIN));

/**
 * Every ring for one ride, soonest first, from `leadMin` before the start. Snoozes get shorter as the start nears (half the time left
 * before the latest wake-up, 3 to 9 minutes). A ride timed for a sunrise or sunset leaves at its start to make it, so waking later than
 * `READY_MIN` before the start (or before the sun, if that is sooner) loses it: the ring after which one more snooze would do that says
 * so, the next says it is now tight, and the rest are about the start. The last ring has no snooze. Rings already past at `now` are
 * left out.
 */
export function planLadder(c: RideContext, i: { leadMin: number; goal: GoalChoice; now: number; clock: (ms: number) => string }): AlarmStep[] {
  const goal = pickGoal(c, i.goal);
  const sun = goal.kind !== 'start';
  const what = goal.kind === 'sunrise' ? 'the sunrise' : 'the sunset';
  const What = goal.kind === 'sunrise' ? 'Sunrise' : 'Sunset';
  const wakeBy = Math.min(goal.at, c.startsAt) - READY_MIN * MIN;
  const at = (ms: number) => i.clock(ms);
  const route = alarmRoute(c.id);
  const out: AlarmStep[] = [];
  let t = c.startsAt - i.leadMin * MIN;
  let lostSaid = false;
  // A lead past half an hour gets one ring more for each further half hour, so the last rings still come close to the start.
  const maxSteps = MAX_STEPS + Math.ceil(Math.max(0, i.leadMin - 30) / 30);
  for (let index = 0; index < maxSteps && t < c.startsAt; index++) {
    // A long lead gets longer snoozes early on, so its rings still reach the start.
    const snoozeMin = Math.min(Math.max(SNOOZE_MAX_MIN, Math.round(i.leadMin / 4)), Math.max(SNOOZE_MIN_MIN, Math.round((wakeBy - t) / MIN / 2)));
    const next = t + snoozeMin * MIN;
    const last = index === maxSteps - 1 || next >= c.startsAt - MIN;
    const startsIn = inMin(c.startsAt - t);
    let title: string;
    let body: string;
    if (last) {
      title = c.group ? `The group leaves in ${startsIn} min` : `${c.title} starts in ${startsIn} min`;
      body = sun && t > wakeBy ? `No more snoozes. ${What} is ${at(goal.at)}: leave the moment you are up.` : 'No more snoozes. Up you get.';
    } else if (t <= wakeBy && next > wakeBy) {
      title = sun ? `Snooze again and you miss ${what}` : c.group ? 'Snooze again and the group waits' : 'Snooze again and you start late';
      body = sun ? `${What} is at ${at(goal.at)}. Up now and you still make it.` : `${c.title} starts at ${at(c.startsAt)}. Up now and you make it.`;
    } else if (t > wakeBy && !lostSaid) {
      lostSaid = true;
      title = sun ? `No time to spare for ${what}` : c.group ? 'The group leaves without you soon' : 'You are cutting it fine';
      body = sun ? `${What} is ${at(goal.at)} and the ride leaves ${at(c.startsAt)}. Up now.` : `${c.title} starts at ${at(c.startsAt)}. Up now.`;
    } else if (index === 0) {
      title = `${c.title} at ${at(c.startsAt)}`;
      body = contextLine(c, goal, at);
    } else {
      title = `${c.title} in ${startsIn} min`;
      body = sun && t <= wakeBy ? `${What} ${at(goal.at)}.` : `Starts at ${at(c.startsAt)}.`;
    }
    out.push({ id: `alarm:${c.id}:${index}`, group: c.id, index, fireAt: t, title, body, snooze: !last, route });
    if (last) break;
    t = next;
  }
  return out.filter((s) => s.fireAt > i.now);
}
