import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { createSerial } from './serial';
import { useRecorder } from '@/store/recorder';

// Start and stop are queued so a quick pause then resume cannot start while the stop is still running.
const inOrder = createSerial();

export const TASK_NAME = 'myto-ride-recording';

/**
 * Runs whenever the phone has new positions, including while the screen is locked or another app is in front.
 * Every position goes through the recorder, which writes it to the journal on disk first. This file must be
 * imported at startup (app/_layout.tsx) so the task exists when the phone wakes the app for it.
 */
TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error || !data) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  for (const l of locations) {
    await useRecorder.getState().ingest({ lat: l.coords.latitude, lng: l.coords.longitude, t: l.timestamp, ele: l.coords.altitude ?? undefined, speed: l.coords.speed, acc: l.coords.accuracy ?? undefined });
  }
});

/** Ask for location access that lasts while the phone is locked. 'foreground' means recording stops when the app is not on screen. */
export async function requestRideLocationAccess(): Promise<'always' | 'foreground' | 'denied'> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'denied';
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === 'granted' ? 'always' : 'foreground';
}

/** True when background recording is not yet allowed, so the rider should be told why we ask before the system prompt. */
export async function needsAlwaysExplainer(): Promise<boolean> {
  try { return (await Location.getBackgroundPermissionsAsync()).status !== 'granted'; } catch { return false; }
}

/** Start background recording. Returns false when it cannot run (no Always permission), so the caller falls back to the foreground watch. */
export const startBackground = (): Promise<boolean> => inOrder(startNow);
async function startNow(): Promise<boolean> {
  try {
    if ((await Location.getBackgroundPermissionsAsync()).status !== 'granted') return false;
    if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME)) return true;
    await Location.startLocationUpdatesAsync(TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 1000,
      pausesUpdatesAutomatically: false, showsBackgroundLocationIndicator: true, activityType: Location.ActivityType.AutomotiveNavigation,
      foregroundService: { notificationTitle: 'Recording your ride', notificationBody: 'Myto Moto is recording your route.' },
    });
    return true;
  } catch {
    return false;
  }
}

export const stopBackground = (): Promise<void> => inOrder(stopNow);
async function stopNow(): Promise<void> {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME)) await Location.stopLocationUpdatesAsync(TASK_NAME);
  } catch { /* already stopped */ }
}
