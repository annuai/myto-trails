import { useEffect } from 'react';
import { simPoint } from '@/lib/sim';
import type { Fix } from '@/lib/location';
import { useLocation } from '@/store/location';
import { useRecorder } from '@/store/recorder';

const toPoint = (f: Fix) => ({ lat: f.lat, lng: f.lng, t: f.t, ele: f.ele, speed: f.speed, acc: f.accuracy });

/** Feeds the recorder from the shared GPS watch, or from a simulated route for testing on a laptop. Mounted once at the root. */
export function RecorderHost() {
  const status = useRecorder((s) => s.status);
  const source = useRecorder((s) => s.source);
  useEffect(() => {
    if (status !== 'running') return;
    const { ingest } = useRecorder.getState();
    if (source === 'sim') {
      let i = 0;
      const id = setInterval(() => void ingest({ ...simPoint(i++, undefined, 0.0045), t: Date.now() }), 1000);
      return () => clearInterval(id);
    }
    const release = useLocation.getState().acquire();
    // Every fix is recorded. What is drawn and counted is decided in the recorder, and what is saved when the ride ends.
    const unsub = useLocation.subscribe((s, prev) => { if (s.fix && s.fix !== prev.fix) void ingest(toPoint(s.fix)); });
    // The fix that arrived before the ride started is the starting point.
    const f = useLocation.getState().fix;
    if (f) void ingest({ ...toPoint(f), t: Date.now() });
    return () => { unsub(); release(); };
  }, [status, source]);
  return null;
}
