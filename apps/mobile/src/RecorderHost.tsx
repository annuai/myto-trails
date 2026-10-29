import { useEffect } from 'react';
import { Platform } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { startBackground, stopBackground } from '@/lib/backgroundLocation';
import type { Fix } from '@/lib/location';
import { simPoint } from '@/lib/sim';
import { useLocation } from '@/store/location';
import { startShakeSensor } from '@/lib/shakeSensor';
import { traceBegin, traceEnd } from '@/lib/motionTraceFile';
import { useMotion } from '@/store/motion';
import { useRecorder } from '@/store/recorder';

const toPoint = (f: Fix) => ({ lat: f.lat, lng: f.lng, t: f.t, ele: f.ele, speed: f.speed, acc: f.accuracy });
const KEEP_AWAKE = 'myto-ride';

/**
 * Feeds the recorder. On a phone with Always location the background task records (it keeps going with the screen
 * locked); otherwise the shared GPS watch does, while the app is on screen. A simulated route is for testing on a
 * laptop. Mounted once at the root.
 */
export function RecorderHost() {
  const status = useRecorder((s) => s.status);
  const source = useRecorder((s) => s.source);
  const paused = useRecorder((s) => s.paused);
  useEffect(() => {
    if (status !== 'running') return;
    const { ingest, setBackgrounded } = useRecorder.getState();
    if (source === 'sim') {
      let i = 0;
      const id = setInterval(() => {
        const p = { ...simPoint(i++, undefined, 0.0045), t: Date.now() };
        useMotion.getState().feed({ t: p.t, lat: p.lat, lng: p.lng });
        if (!useRecorder.getState().paused) void ingest(p);
      }, 1000);
      return () => { clearInterval(id); useMotion.getState().reset(); };
    }
    // A browser tab that goes to the background stops recording; keeping the screen awake helps while it is on screen.
    if (Platform.OS === 'web') void activateKeepAwakeAsync(KEEP_AWAKE).catch(() => undefined);
    // The shared watch always runs: it moves the dot on the map. It records only when the background task cannot.
    const release = useLocation.getState().acquire();
    // Stopped detection runs on every fix and on a clock tick, whether or not the ride is paused.
    const unsubMotion = useLocation.subscribe((s, prev) => { const f = s.fix; if (f && f !== prev.fix) useMotion.getState().feed({ t: f.t, lat: f.lat, lng: f.lng, speed: f.speed, acc: f.accuracy }); });
    const tick = setInterval(() => useMotion.getState().refresh(Date.now()), 1000);
    // The phone's shaking tells riding from standing when GPS is poor, and walking from riding.
    const stopShake = startShakeSensor((t, vib, stepHz) => useMotion.getState().feedShake(t, vib, stepHz), (t) => useMotion.getState().feedOs(t, 'walking'));
    traceBegin();
    const stopMotion = () => { unsubMotion(); clearInterval(tick); stopShake(); traceEnd(); useMotion.getState().reset(); };
    let cancelled = false;
    let unsub: (() => void) | undefined;
    // Paused: the map dot keeps moving, but nothing is recorded and the background task is not running.
    if (paused) return () => { stopMotion(); release(); if (Platform.OS === 'web') void deactivateKeepAwake(KEEP_AWAKE); };
    void startBackground().then((ok) => {
      if (cancelled) { if (ok) void stopBackground(); return; }
      setBackgrounded(ok);
      if (ok) return;
      // Every fix is recorded. What is drawn and counted is decided in the recorder, and what is saved when the ride ends.
      unsub = useLocation.subscribe((s, prev) => { if (s.fix && s.fix !== prev.fix) void ingest(toPoint(s.fix)); });
      // The fix that arrived before the ride started is the starting point.
      const f = useLocation.getState().fix;
      if (f) void ingest({ ...toPoint(f), t: Date.now() });
    });
    return () => {
      cancelled = true;
      unsub?.();
      stopMotion();
      release();
      setBackgrounded(false);
      void stopBackground();
      if (Platform.OS === 'web') void deactivateKeepAwake(KEEP_AWAKE);
    };
  }, [status, source, paused]);
  return null;
}
