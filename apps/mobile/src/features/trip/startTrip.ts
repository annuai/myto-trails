import { todayISO } from '@/lib/dates';
import { dayIndexOn } from '@/lib/tripPlan';
import { useMyRoutes } from '@/store/myRoutes';
import { useTrailStore } from '@/store/trails';
import { useTrips } from '@/store/trips';

type Router = { push: (href: never) => void };

/**
 * Points the next ride at today's day of the trip: a route the rider made is followed on the map, a published trail becomes the
 * planned trail (its line, its access status and its offline pack check). A day with no route leaves the ride free.
 */
export function chooseDayRoute(tripId: string, date: string = todayISO()) {
  const trip = useTrips.getState().trips.find((t) => t.id === tripId);
  const i = trip ? dayIndexOn(trip, date) : null;
  const route = trip && i !== null ? trip.days?.[i]?.route : undefined;
  useMyRoutes.getState().follow(route?.kind === 'mine' ? route.id : undefined);
  if (route?.kind === 'trail') useTrailStore.setState({ nextTrip: { slug: route.slug, name: route.name, status: route.status, statusLabel: route.statusLabel, iso: date } });
}

/** Opens the Ride screen and starts recording at once: the rider chose to start, so there is no second Start to press. */
export function recordNow(router: Router) {
  router.push({ pathname: '/ride', params: { autostart: '1' } } as never);
}

/** The Start trip button: the trip begins, today's route is chosen, and recording starts. */
export function startTrip(tripId: string, router: Router) {
  useTrips.getState().start(tripId);
  chooseDayRoute(tripId);
  recordNow(router);
}

/** A later day of a trip under way: choose that day's route and record. */
export function startTodaysRide(tripId: string, router: Router) {
  chooseDayRoute(tripId);
  recordNow(router);
}
