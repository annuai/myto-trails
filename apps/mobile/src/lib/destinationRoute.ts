import { haversine, type LatLng } from './geo';

/** The road is asked for again once the rider has moved this far from where it was last drawn from. */
export const REROUTE_M = 300;

/** Whether the line to the destination should be fetched again: nothing drawn yet, a new destination, or the rider has moved well off where it started. */
export function needsReroute(last: { from: LatLng; to: LatLng } | undefined, from: LatLng, to: LatLng): boolean {
  if (!last) return true;
  if (last.to.lat !== to.lat || last.to.lng !== to.lng) return true;
  return haversine(last.from, from) > REROUTE_M;
}
