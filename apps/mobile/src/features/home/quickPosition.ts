import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { create } from 'zustand';

/** At most one low-accuracy reading this often. The "Ride home" offer never holds the GPS on. */
export const POSITION_EVERY_MS = 5 * 60_000;

type Reading = { lat: number; lng: number; t: number };
export type QuickPos = { lat?: number; lng?: number; at?: number };

/** The last one-off reading, for `buildHomeWorld` and the hook to read. */
export const useQuickPos = create<QuickPos>(() => ({}));
export const quickPos = (): QuickPos => useQuickPos.getState();

let lastTryAt: number | undefined;
let busy = false;

/** Forgets the last reading and the 5-minute throttle (Erase all, and tests). */
export function resetQuickPosition(): void { lastTryAt = undefined; busy = false; useQuickPos.setState({ lat: undefined, lng: undefined, at: undefined }); }

/** One rough position from the phone, without starting a watch and without asking for permission (no prompt on Home). Undefined when not allowed or not found. */
export async function readOnce(): Promise<Reading | undefined> {
  try {
    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return undefined;
      return await new Promise<Reading | undefined>((resolve) => navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, t: p.timestamp }), () => resolve(undefined), { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }));
    }
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return undefined;
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: p.coords.latitude, lng: p.coords.longitude, t: p.timestamp };
  } catch { return undefined; }
}

/**
 * Takes a reading unless one was tried in the last 5 minutes (a failed try counts, so a denied or missing signal is not retried in a loop).
 * Returns the new position, or undefined when it was skipped or failed. The position is also kept in `useQuickPos`.
 */
export async function quickPosition(now: number, read: () => Promise<Reading | undefined> = readOnce): Promise<{ lat: number; lng: number; at: number } | undefined> {
  if (busy || (lastTryAt !== undefined && now - lastTryAt < POSITION_EVERY_MS)) return undefined;
  busy = true;
  lastTryAt = now;
  try {
    const r = await read();
    if (!r) return undefined;
    const pos = { lat: r.lat, lng: r.lng, at: now };
    useQuickPos.setState(pos);
    return pos;
  } finally { busy = false; }
}
