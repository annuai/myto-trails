import { haversine, type LatLng } from '../geo';
import { ARRIVE_RADIUS_M, LEAVE_RADIUS_M } from '../autoArrive';
import type { PlaceKind } from '../../store/places';

/** A ride shorter than this in distance or time is never ended for the rider. */
export const MIN_RIDE_M = 1_000;
export const MIN_RIDE_MS = 5 * 60_000;
/** Standing still this long inside the arrival circle gives the warning; the end follows if still standing. */
export const WARN_AFTER_STOP_MS = 60_000;
export const END_AFTER_WARN_MS = 30_000;
/** The same, when the rider is being guided to that place: arriving there is the plan, so wait less. */
export const GUIDED_WARN_AFTER_STOP_MS = 20_000;
export const FRESH_FIX_MS = 30_000;
/** After this many "no, keep riding" answers for a place, ask instead of ending. */
export const STRIKES_TO_ASK = 2;
/** Guided to a place means the guidance target is this close to it. */
const GUIDED_TO_M = 50;

const KINDS: PlaceKind[] = ['home', 'work'];

export type AutoEndWorld = {
  now: number;
  pos?: LatLng;
  posAt?: number;
  places: Partial<Record<PlaceKind, { lat: number; lng: number }>>;
  ride: { running: boolean; paused: boolean; startedAt: number; meters: number; source: string; waypointsAhead: boolean };
  inGroupRide: boolean;
  tripActive: boolean;
  guideTo?: { lat: number; lng: number };
  /** How long the bike has stood still, from the recorder's reliable-stop signal. */
  stoppedForMs: number;
  enabled: boolean;
  strikes: Record<PlaceKind, number>;
  cancelled: PlaceKind[];
};

/** `left`: the ride has been LEAVE_RADIUS_M or more from the place. `warnedAt`/`warnedKind`: the warning (or question) already given for this arrival. */
export type AutoEndState = { left: Record<PlaceKind, boolean>; warnedAt: number | null; warnedKind: PlaceKind | null };
export const startAutoEnd: AutoEndState = { left: { home: false, work: false }, warnedAt: null, warnedKind: null };

export type AutoEndStep = { state: AutoEndState; action: 'warn' | 'end' | 'ask' | null; kind?: PlaceKind };

/**
 * One step of the "I have arrived" watch during a ride. A ride that went away from Home or Work and came back, then stands still inside
 * the arrival circle, gets a warning and then ends. It only asks (never ends) for Work unless guided there, or for a place the rider
 * has declined often. Riding off or leaving the circle clears the countdown. Time comes from `w.now`; the stop length from the host.
 */
export function stepAutoEnd(s: AutoEndState, w: AutoEndWorld): AutoEndStep {
  const fresh = !!w.pos && w.posAt !== undefined && w.now - w.posAt <= FRESH_FIX_MS;
  const left = { ...s.left };
  if (fresh) for (const k of KINDS) { const p = w.places[k]; if (p && haversine(w.pos!, p) >= LEAVE_RADIUS_M) left[k] = true; }
  const idle: AutoEndStep = { state: { left, warnedAt: null, warnedKind: null }, action: null };

  const r = w.ride;
  if (!fresh || !w.enabled || !r.running || r.paused || w.inGroupRide || r.source === 'sim') return idle;
  if (r.meters < MIN_RIDE_M || w.now - r.startedAt < MIN_RIDE_MS) return idle;

  let kind: PlaceKind | null = null;
  let best = Infinity;
  let guided = false;
  for (const k of KINDS) {
    const p = w.places[k];
    if (!p || !left[k] || w.cancelled.includes(k)) continue;
    const d = haversine(w.pos!, p);
    const g = !!w.guideTo && haversine(w.guideTo, p) <= GUIDED_TO_M;
    if (d > ARRIVE_RADIUS_M || d >= best || ((w.tripActive || r.waypointsAhead) && !g)) continue;
    kind = k; best = d; guided = g;
  }
  if (!kind || w.stoppedForMs < (guided ? GUIDED_WARN_AFTER_STOP_MS : WARN_AFTER_STOP_MS)) return idle;

  const asks = w.strikes[kind] >= STRIKES_TO_ASK || (kind === 'work' && !guided);
  if (s.warnedAt === null || s.warnedKind !== kind) {
    return { state: { left, warnedAt: w.now, warnedKind: kind }, action: asks ? 'ask' : 'warn', kind };
  }
  const same = { left, warnedAt: s.warnedAt, warnedKind: kind };
  if (!asks && w.now - s.warnedAt >= END_AFTER_WARN_MS) return { state: same, action: 'end', kind };
  return { state: same, action: null };
}
