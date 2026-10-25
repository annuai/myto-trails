import { useEffect } from 'react';
import { simPoint } from '@/lib/sim';
import { useLocation } from '@/store/location';
import { useRecorder } from '@/store/recorder';

const MAX_ACCURACY_M = 80; // a fix less accurate than this moves the dot but is not added to the track

/** Feeds the recorder from the shared GPS watch, or from a simulated route for testing on a laptop. Mounted once at the root. */
export function RecorderHost() {
  const status = useRecorder((s) => s.status);
  const source = useRecorder((s) => s.source);
  useEffect(() => {
    if (status !== 'running') return;
    const { addPoint } = useRecorder.getState();
    if (source === 'sim') {
      let i = 0;
      const id = setInterval(() => addPoint({ ...simPoint(i++, undefined, 0.0045), t: Date.now() }), 1000);
      return () => clearInterval(id);
    }
    const release = useLocation.getState().acquire();
    const unsub = useLocation.subscribe((s, prev) => {
      const f = s.fix;
      if (!f || f === prev.fix) return;
      if (f.accuracy === undefined || f.accuracy <= MAX_ACCURACY_M) addPoint({ lat: f.lat, lng: f.lng, t: f.t, ele: f.ele }, f.speed);
    });
    // The fix that arrived before the ride started is the starting point.
    const f = useLocation.getState().fix;
    if (f && (f.accuracy === undefined || f.accuracy <= MAX_ACCURACY_M)) addPoint({ lat: f.lat, lng: f.lng, t: Date.now(), ele: f.ele }, f.speed);
    return () => { unsub(); release(); };
  }, [status, source]);
  return null;
}
