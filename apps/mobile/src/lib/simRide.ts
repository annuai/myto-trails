import { api } from '@/api/client';
import type { TrailDetail } from '@/api/types';
import type { LatLng } from './geo';
import { prepareTrail, type TrailLine } from './trailGuide';
import { fetchDirections, type Directions } from './turnByTurn';

/** The trail a simulated group ride heads for. Its start point comes from the trails database. */
export const SIM_TRAIL_SLUG = 'manchanabele-dam';

/** The road a simulated group rides: from where this phone is to a trail's start, with the turns on the way. */
export type SimRide = { name: string; directions: Directions; trail: TrailLine };

/** The motorcycle road from `from` to the start of the simulation's trail, with its turns. Throws when the trail or the road service cannot be reached. */
export async function prepareSimRide(from: LatLng, slug: string = SIM_TRAIL_SLUG, signal?: AbortSignal): Promise<SimRide> {
  const detail = await api<TrailDetail>(`/trails/${slug}`, { signal });
  if (!detail.location) throw new Error('The trail has no start point.');
  const directions = await fetchDirections(from, { lat: detail.location.lat, lng: detail.location.lon }, signal);
  return { name: detail.name, directions, trail: prepareTrail(directions.line) };
}
