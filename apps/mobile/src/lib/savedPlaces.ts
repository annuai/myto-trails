import { useMemo } from 'react';
import type { LatLng } from './geo';
import { placesOf } from './privacy';
import { usePlaces } from '@/store/places';

/** The rider's Home and Work right now, for trimming anything that leaves the phone. */
export const savedPlaces = (): LatLng[] => placesOf(usePlaces.getState());

/** `savedPlaces` for a screen, kept up to date. */
export function useSavedPlaces(): LatLng[] {
  const home = usePlaces((s) => s.home);
  const work = usePlaces((s) => s.work);
  return useMemo(() => placesOf({ home, work }), [home, work]);
}
