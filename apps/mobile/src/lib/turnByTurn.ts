// Following turn-by-turn directions as the rider moves.

import type { LatLng } from './geo';
import { trackOnLine } from './routeFollow';
import { parseTrip, route, type Directions, type RoutePrefs, type Step, type ValhallaAnswer } from './routing';

export { turnKind, type Directions, type Step, type TurnKind } from './routing';

/** The road line and its turns, from Valhalla's answer. The line is kept whole: the turns point into it by index. */
export function parseDirections(body: ValhallaAnswer): Directions {
  return parseTrip(body.trip);
}

/** What can shape a request for directions: the heading, route preferences and a way to cancel. */
export type DirectionsOptions = { /** The way the rider faces, when moving. */ heading?: number; prefs?: RoutePrefs; signal?: AbortSignal };

/** The road to `to` for a motorcycle, with its turns. Falls back to a second router; see lib/routing. */
export async function fetchDirections(from: LatLng, to: LatLng, opts: DirectionsOptions | AbortSignal = {}): Promise<Directions> {
  const o: DirectionsOptions = 'aborted' in opts ? { signal: opts } : opts;
  const [best] = await route({ stops: [from, to], heading: o.heading, prefs: o.prefs }, o.signal);
  return best!;
}

/** Within this of the end counts as arrived. */
export const ARRIVED_M = 40;

export type NavState = { /** The turn to make next, or the arrival. */ next: Step; /** Metres to it. */ toNextM: number; remainingM: number; offM: number; arrived: boolean; alongM: number };

/**
 * Where each set of directions last matched the rider. Several screens read the same directions at the same position, so this is kept by
 * the directions object itself rather than by the caller; a new route starts afresh.
 */
const progress = new WeakMap<Directions, number>();

/** Where the rider is on the directions: the next turn, how far to it and to the end, and how far they are from the line. */
export function navigateStep(d: Directions, p: LatLng): NavState {
  const at = trackOnLine(d.line, p, progress.get(d));
  const alongM = at?.alongM ?? 0;
  if (at) progress.set(d, alongM);
  const last = d.steps[d.steps.length - 1]!;
  const next = d.steps.find((s) => s.atM > alongM + 1) ?? last;
  const remainingM = Math.max(0, d.totalM - alongM);
  return { next, toNextM: Math.max(0, next.atM - alongM), remainingM, offM: at?.distM ?? Infinity, arrived: remainingM <= ARRIVED_M, alongM };
}
