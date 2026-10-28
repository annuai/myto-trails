import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useRootNavigationState, useRouter } from 'expo-router';
import { notifier, useTappedRoute } from '@/lib/notifier';
import { createSyncer } from '@/lib/reminderSync';
import { useNotifications } from '@/store/notifications';
import { useRecorder } from '@/store/recorder';
import { totalKm, useRides } from '@/store/rides';
import { useTodos } from '@/store/todos';
import { useTrailStore } from '@/store/trails';

const syncer = createSyncer({
  now: Date.now,
  store: useNotifications,
  notifier,
  world: () => {
    const trip = useTrailStore.getState().nextTrip;
    const rec = useRecorder.getState();
    return {
      todos: useTodos.getState().todos,
      appKm: totalKm(useRides.getState().rides),
      trip: trip ? { slug: trip.slug, name: trip.name, iso: trip.iso } : undefined,
      paused: rec.status !== 'idle' && rec.paused ? { since: rec.pausedAt } : undefined,
    };
  },
});

/** Re-runs the sync after a quiet second, so a burst of edits is one sync. */
let timer: ReturnType<typeof setTimeout> | undefined;
const soon = () => { clearTimeout(timer); timer = setTimeout(() => void syncer.sync().catch(() => undefined), 1000); };

/**
 * Keeps the phone's reminders matching what the rider has: syncs when the app opens or comes back to the front, and whenever
 * to-dos, the planned trip, rides, a pause or the reminder settings change. Opens the screen a tapped notification points to.
 */
export function NotificationHost() {
  const router = useRouter();
  const tap = useTappedRoute();
  const ready = !!useRootNavigationState()?.key; // a tap that launched the app must wait for the navigator
  useEffect(() => {
    soon();
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') soon(); });
    let prefs = useNotifications.getState().prefs;
    let pause = '';
    const off = [
      useTodos.subscribe(soon), useRides.subscribe(soon), useTrailStore.subscribe(soon),
      useNotifications.subscribe((s) => { if (s.prefs !== prefs) { prefs = s.prefs; soon(); } }),
      useRecorder.subscribe((s) => { const k = `${s.status}:${s.paused}:${s.pausedAt}`; if (k !== pause) { pause = k; soon(); } }),
    ];
    return () => { app.remove(); off.forEach((f) => f()); clearTimeout(timer); };
  }, []);
  useEffect(() => { if (tap && ready) router.push(tap.route as never); }, [tap?.key, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Runs a sync now (after the permission changes, or to refresh the history). */
export const syncReminders = () => syncer.sync();
