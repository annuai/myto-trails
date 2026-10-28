import { Platform } from 'react-native';
import * as Location from 'expo-location';

export type Fix = { lat: number; lng: number; t: number; ele?: number; speed?: number | null; accuracy?: number };

/**
 * Watch the device position. Web uses the browser's own geolocation directly (expo-location's web layer hides errors and
 * ignores some options); phones use expo-location. Errors are reported in words so the screen can say what is wrong.
 * Returns a function that stops watching.
 */
export function watchLocation(onFix: (f: Fix) => void, onError: (message: string, fatal: boolean) => void): () => void {
  if (Platform.OS === 'web') return watchWeb(onFix, onError);
  let stopped = false;
  let sub: Location.LocationSubscription | undefined;
  (async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return onError('Location is turned off for Myto Moto. Allow it in your phone settings.', true);
      const last = await Location.getLastKnownPositionAsync().catch(() => null); // an instant rough position while GPS warms up
      if (last && !stopped) onFix({ lat: last.coords.latitude, lng: last.coords.longitude, t: last.timestamp, accuracy: last.coords.accuracy ?? undefined });
      const s = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 0, timeInterval: 1000 }, (loc) =>
        onFix({ lat: loc.coords.latitude, lng: loc.coords.longitude, t: loc.timestamp, ele: loc.coords.altitude ?? undefined, speed: loc.coords.speed, accuracy: loc.coords.accuracy ?? undefined }));
      if (stopped) s.remove(); else sub = s;
    } catch {
      onError('GPS is not available on this device right now.', false);
    }
  })();
  return () => { stopped = true; sub?.remove(); };
}

function watchWeb(onFix: (f: Fix) => void, onError: (message: string, fatal: boolean) => void): () => void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) { onError('This browser cannot find your location.', true); return () => undefined; }
  const ok = (p: GeolocationPosition) => onFix({ lat: p.coords.latitude, lng: p.coords.longitude, t: p.timestamp, ele: p.coords.altitude ?? undefined, speed: p.coords.speed, accuracy: p.coords.accuracy });
  const err = (e: GeolocationPositionError) => onError(
    e.code === 1 ? 'Location is blocked for this site. Allow it in the browser’s site settings, then reload.'
      : e.code === 2 ? 'Your device could not work out where it is. Try again in the open.'
      : 'Still looking for your location. Move to open sky and keep this screen on.',
    e.code === 1,
  );
  // A quick rough fix first (cell or wifi), then high accuracy updates; the watch keeps going after a timeout.
  navigator.geolocation.getCurrentPosition(ok, () => undefined, { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 });
  const id = navigator.geolocation.watchPosition(ok, err, { enableHighAccuracy: true, maximumAge: 2_000, timeout: 30_000 });
  return () => navigator.geolocation.clearWatch(id);
}
