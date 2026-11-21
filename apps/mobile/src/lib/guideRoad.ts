import type { LatLng } from './geo';

/**
 * The place the ride screen asks the road service to take the rider to. A rider being helped comes first, then a place the rider chose, which
 * overrides a loaded trail (the trail stays on the map and recording goes on; "Stop guiding" goes back to it). With a trail and no chosen
 * place, the start first and then the way back on. Last, the group's destination, which a trail outranks.
 */
export function roadToward(i: { rescue?: LatLng; target?: LatLng; sim: boolean; trail: boolean; toStart: boolean; start?: LatLng; rejoin?: LatLng; regroup?: LatLng }): LatLng | undefined {
  if (i.rescue) return i.rescue;
  if (i.sim) return undefined;
  if (i.target) return i.target;
  if (i.trail) return i.toStart ? i.start : i.rejoin;
  return i.regroup;
}
