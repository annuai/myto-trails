import { useEffect } from 'react';
import { AppState } from 'react-native';
import { alarmsSet, refreshNudgeData } from '@/lib/nudge/refresh';
import { syncReminders } from '@/NotificationHost';
import { useAuth } from '@/store/auth';
import { useNudges } from '@/store/nudges';

let running = false;
/** Brings the weather and club rides up to date, then rebuilds the plan so it is made from them. Once at a time. */
async function refreshAndPlan() {
  if (running) return;
  running = true;
  try {
    await refreshNudgeData(useAuth.getState().token);
    await syncReminders().catch(() => undefined);
  } finally { running = false; }
}

/** When the app opens or comes back to the front, the ride nudges (and ride alarms) read fresh data (weather, club rides) and are planned again. */
export function NudgeHost() {
  useEffect(() => {
    const wanted = () => (!!useNudges.getState().level && useNudges.getState().level !== 'off') || alarmsSet();
    if (wanted()) void refreshAndPlan();
    const app = AppState.addEventListener('change', (s) => { if (s === 'active' && wanted()) void refreshAndPlan(); });
    // Choosing a level starts it straight away.
    const unsub = useNudges.subscribe((s, prev) => { if (s.level !== prev.level && s.level && s.level !== 'off') void refreshAndPlan(); });
    return () => { app.remove(); unsub(); };
  }, []);
  return null;
}
