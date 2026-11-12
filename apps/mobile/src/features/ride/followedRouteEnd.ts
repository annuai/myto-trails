import type { LatLng } from '@/lib/geo';
import { useMyRoutes } from '@/store/myRoutes';
import { useTrailStore } from '@/store/trails';

/** The end of the route the rider is following: one of their own, or a published trail whose route is saved on the phone. */
export function followedRouteEnd(): LatLng | undefined {
  const mine = useMyRoutes.getState();
  const own = mine.routes.find((r) => r.id === mine.followId)?.points;
  if (own?.length) return own[own.length - 1];
  const trip = useTrailStore.getState().nextTrip;
  const end = trip ? useTrailStore.getState().offline[trip.slug]?.route?.line.at(-1) : undefined;
  return end ? { lat: end[1], lng: end[0] } : undefined;
}
