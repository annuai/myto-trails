import { bearing, type LatLng } from './geo';
import { nearestOnLine } from './routeFollow';
import { pointAt, type TrailLine } from './trailGuide';

/**
 * What keeps the live map calm. GPS is noisy: a fix can be 5 to 10 metres off, and the direction worked out from two nearby fixes can swing by
 * tens of degrees. Fed straight to the camera, that shakes the map and spins it back and forth. These functions turn raw fixes into a steady
 * position and heading. They are pure: the same inputs always give the same answer, so they are tested without a phone.
 */

/** Below this speed (about 7 km/h) a heading is not trusted: a stopped phone drifts in every direction, so the last heading is kept. */
export const MIN_HEADING_MPS = 2;
/** A change of heading smaller than this is noise. */
export const HEADING_DEADBAND_DEG = 6;
/** How much of the way to a new heading is taken each step, and the fastest the heading may turn. */
const HEADING_GAIN = 0.3;
export const MAX_TURN_DEG_PER_S = 60;

export const norm = (deg: number): number => ((deg % 360) + 360) % 360;
/** The shortest signed turn from `from` to `to`, in -180 to 180. */
export const turnBetween = (from: number, to: number): number => ((((to - from) % 360) + 540) % 360) - 180;

/** On a road the direction is the road's own, with no noise to smooth: it is followed quickly, so the map and arrow are not still facing the last straight when a corner comes. */
const ROAD_GAIN = 0.85;
const ROAD_DEADBAND_DEG = 1;
export const ROAD_MAX_TURN_DEG_PER_S = 150;

/**
 * The heading after one step: unchanged while slow, else moved part of the way, never faster than the limit. From a GPS course (noisy) it is
 * moved slowly and a wobble inside the deadband is ignored. `onRoad` means the sample is a road's own direction: it is followed quickly.
 */
export function smoothHeading(prev: number | undefined, sample: number | undefined, speedMps: number, dtS: number, onRoad = false): number | undefined {
  if (sample === undefined || !(speedMps >= MIN_HEADING_MPS)) return prev;
  if (prev === undefined) return norm(sample);
  const delta = turnBetween(prev, sample);
  if (Math.abs(delta) < (onRoad ? ROAD_DEADBAND_DEG : HEADING_DEADBAND_DEG)) return prev;
  const limit = (onRoad ? ROAD_MAX_TURN_DEG_PER_S : MAX_TURN_DEG_PER_S) * Math.max(0.2, dtS);
  return norm(prev + Math.max(-limit, Math.min(limit, delta * (onRoad ? ROAD_GAIN : HEADING_GAIN))));
}

/** A bearing for the camera that continues from the last one instead of wrapping (359 then 2 becomes 359 then 362), so it never spins the long way round. */
export function unwrapBearing(prev: number, next: number): number {
  return prev + turnBetween(norm(prev), norm(next));
}

/** A rider this close to a planned road is shown on it; once on it, they stay on it until this far away. */
export const SNAP_M = 30;
export const RELEASE_M = 50;
/** The direction of the road is read this far ahead of the rider, or further at speed (about a second and a bit of riding), so a corner is met facing into it. */
export const lookAheadM = (speedMps: number): number => Math.max(15, Math.min(45, speedMps * 1.3));

export type Matched = { point: LatLng; heading: number; alongM: number };

/**
 * Puts a fix on the planned road: the nearest point on it, and the road's own direction a little ahead. `snapped` is whether the rider was
 * on the road at the last fix, so the limit is looser to leave than to join (a fix at 29, 31, 29 m away does not flicker). Null when the
 * rider is not on the road. `alongM` never goes back by more than 25 m, so a fix jittering across the road cannot send a turn card backwards.
 */
export function matchToRoad(road: TrailLine, fix: LatLng, snapped: boolean, prevAlongM?: number, lookM: number = lookAheadM(0)): Matched | null {
  const near = nearestOnLine(road.line, fix);
  if (!near || near.distM > (snapped ? RELEASE_M : SNAP_M)) return null;
  const along = prevAlongM !== undefined && near.alongM < prevAlongM && prevAlongM - near.alongM < 25 ? prevAlongM : near.alongM;
  const here = pointAt(road, along);
  return { point: here, heading: bearing(here, pointAt(road, Math.min(road.totalM, along + lookM))), alongM: along };
}

/** How long to glide the camera to the next position: the time since the last fix, within a sensible range. */
export function glideMs(sinceLastFixMs: number | undefined): number {
  return sinceLastFixMs === undefined || !(sinceLastFixMs > 0) ? 1000 : Math.max(600, Math.min(1500, sinceLastFixMs));
}

/**
 * The distance on the turn card, in whole steps so its digits do not change every second: to 100 metres in 5s, to a kilometre in 10s,
 * beyond that in 100s. It never rounds a turn that is still ahead down to nothing.
 */
export function roundedDistanceM(m: number): number {
  if (m >= 1000) return Math.round(m / 100) * 100;
  if (m >= 100) return Math.round(m / 10) * 10;
  return Math.max(5, Math.round(m / 5) * 5);
}
