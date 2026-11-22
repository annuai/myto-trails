// Planning a route along real roads.

import { pathLength, type LatLng } from './geo';
import { PLAN_KMH, simplify, type PlannedRoute } from './routePlan';
import { route, type Directions, type RoutePrefs } from './routing';

export { decodePolyline } from './routing';

/** The public server refuses more than 20 locations in one request. */
export const MAX_STOPS_PER_REQUEST = 20;
/** Road geometry is dense; dropping points within 5 m of the line keeps its shape and a saved route small. */
const SIMPLIFY_M = 5;

/** Runs of stops that fit one request. Neighbouring runs share their joining stop, so the legs meet. */
export function chunkStops<T>(stops: T[], max = MAX_STOPS_PER_REQUEST): T[][] {
  const runs: T[][] = [];
  for (let i = 0; i < stops.length - 1; i += max - 1) runs.push(stops.slice(i, i + max));
  return runs;
}

/** The planned routes: the best first, then alternatives. */
export type RoadPlan = {
  /** The best route first, then any alternatives (offered only between two stops). */
  routes: PlannedRoute[];
  /** Runs of stops the road service could not route; they are joined by straight lines so the rest of the route still follows roads. */
  straightRuns: number;
};

type Asker = typeof route;

const asPlanned = (d: Directions): PlannedRoute => ({ points: simplify(d.line, SIMPLIFY_M), distanceKm: d.totalM / 1000, etaMin: d.etaMin });

/** The road route a motorcycle can ride through the stops, in order. Stops off a road are moved to the nearest one. Throws only when nothing at all could be routed. */
export async function roadRoute(stops: LatLng[], opts: { prefs?: RoutePrefs; alternates?: number; signal?: AbortSignal } = {}, ask: Asker = route): Promise<RoadPlan> {
  const runs = chunkStops(stops);
  if (runs.length === 1 && opts.alternates) {
    const all = await ask({ stops: runs[0]!, prefs: opts.prefs, alternates: opts.alternates }, opts.signal);
    return { routes: all.map(asPlanned), straightRuns: 0 };
  }
  const points: LatLng[] = [];
  let km = 0, minutes = 0, straightRuns = 0;
  let firstError: unknown;
  for (const run of runs) {
    let line: LatLng[], runKm: number, runMin: number;
    try {
      const [best] = await ask({ stops: run, prefs: opts.prefs }, opts.signal);
      line = best!.line; runKm = best!.totalM / 1000; runMin = best!.etaMin;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') throw e;
      firstError ??= e;
      straightRuns++;
      line = run; runKm = pathLength(run) / 1000; runMin = Math.round((runKm / PLAN_KMH) * 60);
    }
    points.push(...(points.length ? line.slice(1) : line));
    km += runKm; minutes += runMin;
  }
  if (straightRuns === runs.length) throw firstError instanceof Error ? firstError : new Error('routing failed');
  return { routes: [{ points: simplify(points, SIMPLIFY_M), distanceKm: km, etaMin: minutes }], straightRuns };
}
