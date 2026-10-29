import { haversine, type LatLng } from './geo';

/** Within this of the home point or the end of the route counts as arrived. */
export const ARRIVE_RADIUS_M = 200;
/** The rider must first have been this far away, or a check-in set at home would close the moment the ride starts there. */
export const LEAVE_RADIUS_M = 1_000;

export type ArriveTargets = { home?: LatLng; routeEnd?: LatLng };
export type ArriveState = { leftHome: boolean; leftEnd: boolean };
export const startArrive: ArriveState = { leftHome: false, leftEnd: false };

/**
 * One step of the "have I arrived" watch for an open check-in. Arrived means close to where the check-in was set (home) or to the
 * end of the route being followed, after having been away from it. The first of the two to be reached wins.
 */
export function stepArrive(s: ArriveState, pos: LatLng, t: ArriveTargets): { state: ArriveState; arrived: 'home' | 'route' | null } {
  const next = { ...s };
  let arrived: 'home' | 'route' | null = null;
  if (t.home) {
    const d = haversine(pos, t.home);
    if (d >= LEAVE_RADIUS_M) next.leftHome = true;
    if (s.leftHome && d <= ARRIVE_RADIUS_M) arrived = 'home';
  }
  if (t.routeEnd) {
    const d = haversine(pos, t.routeEnd);
    if (d >= LEAVE_RADIUS_M) next.leftEnd = true;
    if (!arrived && s.leftEnd && d <= ARRIVE_RADIUS_M) arrived = 'route';
  }
  return { state: next, arrived };
}
