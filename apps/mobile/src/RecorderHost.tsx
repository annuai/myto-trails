import { useEffect } from 'react';
import * as Location from 'expo-location';
import { simPoint } from '@/lib/sim';
import { useRecorder } from '@/store/recorder';

/** Feeds the recorder from the phone's GPS, or from a simulated route for testing on a laptop. Mounted once at the root. */
export function RecorderHost() {
  const status = useRecorder((s) => s.status);
  const source = useRecorder((s) => s.source);
  useEffect(() => {
    if (status !== 'running') return;
    const { addPoint, setError } = useRecorder.getState();
    if (source === 'sim') {
      let i = 0;
      const id = setInterval(() => addPoint({ ...simPoint(i++, undefined, 0.0045), t: Date.now() }), 1000);
      return () => clearInterval(id);
    }
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') return setError('Location permission was not granted.');
        const s = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 1000 }, (loc) =>
          addPoint({ lat: loc.coords.latitude, lng: loc.coords.longitude, t: loc.timestamp, ele: loc.coords.altitude ?? undefined }, loc.coords.speed));
        if (cancelled) s.remove(); else sub = s;
      } catch {
        setError('GPS is not available here.');
      }
    })();
    return () => { cancelled = true; sub?.remove(); };
  }, [status, source]);
  return null;
}
