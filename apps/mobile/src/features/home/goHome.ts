import type { useRouter } from 'expo-router';
import type { SavedPlace } from '@/store/places';
import { useGuideTarget } from '@/store/guideTarget';
import { useRecorder } from '@/store/recorder';

/** Ride home: guide there (the default), or with `record` also record the ride, starting one unless one is already running. */
export function goHome(router: Pick<ReturnType<typeof useRouter>, 'push'>, home: SavedPlace, opts?: { record?: boolean }): void {
  if (!opts?.record) {
    router.push({ pathname: '/navigate', params: { lat: String(home.lat), lng: String(home.lng) } });
    return;
  }
  useGuideTarget.getState().set({ lat: home.lat, lng: home.lng, name: 'Home' });
  if (useRecorder.getState().status === 'running') router.push('/ride/live');
  else router.push({ pathname: '/ride', params: { autostart: '1' } });
}
