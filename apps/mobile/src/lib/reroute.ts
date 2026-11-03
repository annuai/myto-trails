import { bearing, haversine, type LatLng } from './geo';
import { turnBetween } from './rideCamera';
import { nearestOnLine } from './routeFollow';
import { pointAt, type TrailLine } from './trailGuide';

/**
 * The rerouting engine: when the rider has left the route they are following, and when to ask for a new way. Pure, like lib/routeFollow:
 * what it is told goes in, a verdict comes out, and the caller does the asking. It never fetches anything and never reads a clock.
 *
 * A rider moves through four phases. `on` the route; `suspect` once beyond the limit (a wide bend, a GPS blip and a rider who has stopped at
 * the roadside are all possible, so it waits); `off` once it is sure; `asking` while a new way is being fetched. Being sure takes the first
 * of: a long way off, heading the wrong way for a short distance, or staying away while moving for a few seconds. How far is "off" follows
 * the GPS: a poor fix widens it, so a rider in a gorge is not sent in circles.
 */
export type Phase = 'on' | 'suspect' | 'off';

export const MIN_OFF_M = 35;
/** The limit is this many times the GPS's own error, if that is more than the minimum. */
export const ACC_FACTOR = 2.5;
export const MAX_OFF_M = 120;
/** Coming back inside this share of the limit is back on the route: the gap stops a rider on the edge flipping each fix. */
export const BACK_ON_SHARE = 0.6;
/** So far away that waiting makes no sense. */
export const FAR_M = 250;
/** Facing more than this from the way the route runs... */
export const WRONG_WAY_DEG = 90;
/** ...for this long a stretch, with this much speed to be sure the heading is real, is the wrong way. */
export const WRONG_WAY_TRAVEL_M = 50;
export const MIN_HEADING_MPS = 2;
/** Away from the route and moving: sure after this long and this far. A rider who is standing still is not lost. */
export const CONFIRM_MS = 6_000;
export const CONFIRM_TRAVEL_M = 30;
/** The wait between asking for a way: after an answer, then after each failure in turn. */
export const COOLDOWN_MS = 10_000;
export const BACKOFF_MS = [15_000, 30_000, 60_000] as const;
/** An answer is dropped if the rider has moved this far from where the question was asked: the way it describes starts somewhere behind them. */
export const STALE_M = 150;
/** The rejoin point on a trail is this far ahead of the rider, or about this many seconds ahead at speed, whichever is more. */
export const REJOIN_MIN_AHEAD_M = 150;
export const REJOIN_AHEAD_S = 15;

export type RerouteState = {
  phase: Phase;
  /** When the rider first went beyond the limit, and how far they have travelled since. */
  suspectSince: number | null;
  wrongWayM: number;
  travelM: number;
  /** The earliest time to ask again. */
  nextAskAt: number;
  failures: number;
  /** Which question is out: answers carry the number they were asked with, so an old one is told apart from the one wanted. 0 when none is. */
  asking: number;
  /** Counts questions asked, to number the next. */
  seq: number;
};
export const startReroute: RerouteState = { phase: 'on', suspectSince: null, wrongWayM: 0, travelM: 0, nextAskAt: 0, failures: 0, asking: 0, seq: 0 };

export type Reading = {
  now: number;
  /** Metres from the route. */
  distM: number;
  /** The GPS's own error, when it says. */
  accM?: number;
  speedMps: number;
  /** The way the rider is travelling, when it is known. */
  headingDeg?: number;
  /** The way the route runs where the rider is nearest to it. */
  routeDeg?: number;
  /** Metres moved since the last reading. */
  stepM: number;
};

/** How far from the route is "off" for this fix. */
export const offLimitM = (accM: number | undefined, speedMps: number): number => Math.min(MAX_OFF_M, Math.max(MIN_OFF_M, ACC_FACTOR * (accM ?? 0), speedMps * 1.5));

export type Step = {
  state: RerouteState;
  /** Just became sure the rider is off the route. */
  wentOff: boolean;
  /** Back on it. */
  backOn: boolean;
  /** Ask for a new way now; the answer must come back with `seq`. */
  ask: boolean;
  seq: number;
};

const idle = (state: RerouteState): Step => ({ state, wentOff: false, backOn: false, ask: false, seq: 0 });

/** One reading. Call with each position while a route is being followed. */
export function stepReroute(s: RerouteState, r: Reading): Step {
  const limit = offLimitM(r.accM, r.speedMps);
  const back = limit * BACK_ON_SHARE;
  if (r.distM <= (s.phase === 'on' ? limit : back)) {
    if (s.phase === 'on') return s.suspectSince === null ? idle(s) : idle({ ...s, suspectSince: null, wrongWayM: 0, travelM: 0 });
    // Back on the route: a question still out is forgotten, so its answer is dropped when it arrives.
    return { state: { ...s, phase: 'on', suspectSince: null, wrongWayM: 0, travelM: 0, failures: 0, asking: 0 }, wentOff: false, backOn: s.phase === 'off', ask: false, seq: 0 };
  }
  if (s.phase === 'off') return maybeAsk(s, r.now, false);
  // Beyond the limit and not yet sure (or already off, below).
  const suspectSince = s.suspectSince ?? r.now;
  const moving = r.speedMps >= MIN_HEADING_MPS;
  const travelM = s.travelM + (moving ? r.stepM : 0);
  const facing = r.headingDeg !== undefined && r.routeDeg !== undefined && moving;
  const wrongWayM = facing && Math.abs(turnBetween(r.routeDeg!, r.headingDeg!)) > WRONG_WAY_DEG ? s.wrongWayM + r.stepM : 0;
  const sure = r.distM >= FAR_M || wrongWayM >= WRONG_WAY_TRAVEL_M || (r.now - suspectSince >= CONFIRM_MS && travelM >= CONFIRM_TRAVEL_M);
  if (!sure) return idle({ ...s, phase: 'suspect', suspectSince, travelM, wrongWayM });
  return maybeAsk({ ...s, phase: 'off', suspectSince, travelM, wrongWayM }, r.now, true);
}

function maybeAsk(s: RerouteState, now: number, wentOff: boolean): Step {
  if (s.asking !== 0 || now < s.nextAskAt) return { state: s, wentOff, backOn: false, ask: false, seq: 0 };
  const seq = s.seq + 1;
  return { state: { ...s, asking: seq, seq }, wentOff, backOn: false, ask: true, seq };
}

/** A question that has not been asked yet for lack of a position, or one that must go out again: the first way to a place, with nothing to be off. */
export function askFirst(s: RerouteState, now: number): Step {
  return maybeAsk(s, now, false);
}

/** The answer to question `seq` arrived. False when it is not the question that is out, or the rider has moved on from where it was asked. */
export function isFresh(s: RerouteState, seq: number, askedAt: LatLng, here: LatLng): boolean {
  return s.asking === seq && haversine(askedAt, here) <= STALE_M;
}

/** The way was found and is being used. The next question waits out the cooldown. */
export function answered(s: RerouteState, now: number): RerouteState {
  return { ...s, asking: 0, failures: 0, nextAskAt: now + COOLDOWN_MS };
}

/** The question failed: the next waits longer after each failure, up to a minute. */
export function failed(s: RerouteState, now: number): RerouteState {
  const failures = s.failures + 1;
  return { ...s, asking: 0, failures, nextAskAt: now + BACKOFF_MS[Math.min(failures - 1, BACKOFF_MS.length - 1)]! };
}

/** The answer was thrown away as out of date, or the rider is back on the route: nothing is wrong, so the next question may go out at once. */
export function dropped(s: RerouteState, now: number): RerouteState {
  return { ...s, asking: 0, nextAskAt: now };
}

/** The way the route runs at the segment the rider is nearest to. */
export function routeBearing(line: LatLng[], at: { segment: number } | null): number | undefined {
  if (!at) return undefined;
  const a = line[at.segment], b = line[at.segment + 1];
  return a && b ? bearing(a, b) : undefined;
}

/** A reading of the rider against a route that is simple to read all at once (a road to a place). `prev` is the last position, for the step. */
export function readAgainst(line: LatLng[], here: LatLng, prev: LatLng | undefined, motion: { now: number; accM?: number; speedMps: number; headingDeg?: number }): Reading | null {
  const at = nearestOnLine(line, here);
  if (!at) return null;
  return { ...motion, distM: at.distM, routeDeg: routeBearing(line, at), stepM: prev ? haversine(prev, here) : 0 };
}

/** Where on a trail to rejoin it: some way ahead of the rider's nearest point, so the way back does not point at a spot they have already passed. */
export function rejoinTarget(t: TrailLine, alongM: number, speedMps: number): LatLng {
  return pointAt(t, alongM + Math.max(REJOIN_MIN_AHEAD_M, speedMps * REJOIN_AHEAD_S));
}
