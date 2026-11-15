import type { useRouter } from 'expo-router';
import type { SavedPlace } from '@/store/places';
import { useGuideTarget } from '@/store/guideTarget';
import { useRecorder } from '@/store/recorder';

/** Ride home: the ride screen with the route to Home on its map (one guided screen, no separate navigate page). Starts a ride unless one is running. */
export function goHome(router: Pick<ReturnType<typeof useRouter>, 'push'>, home: SavedPlace): void {
  useGuideTarget.getState().set({ lat: home.lat, lng: home.lng, name: 'Home' });
  if (useRecorder.getState().status === 'running') router.push('/ride/live');
  else router.push({ pathname: '/ride', params: { autostart: '1' } });
}
