import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useRootNavigationState, useRouter } from 'expo-router';
import { takeWoken } from '@/lib/alarm/backend';
import { alarmRoute } from '@/lib/alarm/ladder';
import { useAlarmResponse } from '@/lib/notifier';
import { useAlarms } from '@/store/alarms';

/** "I'm up" this recently opens the pre-ride screen; an older one (the app opened hours later) only stops the alarm. */
const FRESH_MS = 15 * 60_000;

/**
 * Hears "I'm up". From the phone's alarm (Android receiver, AlarmKit intent) it is read back when the app comes to the front; from a
 * notification ring it is the button or a tap. Either way the ride's other rings are cancelled at the next sync, and a fresh one opens
 * the pre-ride screen.
 */
export function AlarmHost() {
  const router = useRouter();
  const ready = !!useRootNavigationState()?.key;
  const response = useAlarmResponse();
  const handled = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!ready) return;
    const read = async () => {
      const woken = await takeWoken();
      const now = Date.now();
      for (const w of woken) useAlarms.getState().markWoke(w.group, w.at);
      const fresh = woken.filter((w) => now - w.at < FRESH_MS).sort((a, b) => b.at - a.at)[0];
      if (fresh) router.push(alarmRoute(fresh.group) as never);
    };
    void read();
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') void read(); });
    return () => app.remove();
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Snooze only takes the ring away: the next one is already set.
    if (!response || !ready || handled.current === response.key || response.action === 'snooze') return;
    handled.current = response.key;
    useAlarms.getState().markWoke(response.group, Date.now());
    // A tap on the ring itself is opened by the notification host; the button is not.
    if (response.action === 'up') router.push(alarmRoute(response.group) as never);
  }, [response?.key, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
