import { useEffect } from 'react';
import { quickWidgetProps } from '@/lib/quickWidget';
import { updateQuickWidget } from '@/lib/quickWidgetSurface';
import { useCompanion } from '@/store/companion';
import { useRecorder } from '@/store/recorder';

/** Keeps the home-screen quick-actions widget in step with the ride: on every state change, and every minute for the distance and time. Mounted once at the root. */
export function QuickWidgetHost() {
  useEffect(() => {
    let last = '';
    const push = (force = false) => {
      const rec = useRecorder.getState();
      const p = quickWidgetProps({ recording: rec.status === 'running', paused: rec.paused, group: !!useCompanion.getState().group, elapsedMs: rec.elapsedMs(Date.now()), meters: rec.meters });
      const key = JSON.stringify(p);
      if (!force && key === last) return;
      last = key;
      updateQuickWidget(p);
    };
    push(true);
    const tick = setInterval(() => push(), 60_000);
    const offs = [useRecorder.subscribe(() => push()), useCompanion.subscribe(() => push())];
    return () => { clearInterval(tick); offs.forEach((o) => o()); };
  }, []);
  return null;
}
