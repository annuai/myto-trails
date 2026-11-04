import { Platform } from 'react-native';
import * as Location from 'expo-location';
import type { Fix } from './location';

/** Asks the phone for a position right now, for a GPS that has gone quiet. Null when none comes in time (or on the web, where the watch already does this). */
export async function probePosition(timeoutMs = 6_000): Promise<Fix | null> {
  if (Platform.OS === 'web') return null;
  try {
    const loc = await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))]);
    return loc ? { lat: loc.coords.latitude, lng: loc.coords.longitude, t: loc.timestamp, ele: loc.coords.altitude ?? undefined, speed: loc.coords.speed, accuracy: loc.coords.accuracy ?? undefined } : null;
  } catch {
    return null;
  }
}
