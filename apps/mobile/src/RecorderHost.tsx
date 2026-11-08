import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { startBackground, stopBackground } from '@/lib/backgroundLocation';
import type { Fix } from '@/lib/location';
import { noisyFix, SIM_GROUP_ID, SIM_ME, SIM_ME_NAME, SIM_ROAD_SPEED_MPS, SIM_SPEED_MPS, SIM_TRAIL, simMePoint, simRegroup, simRiders } from '@/lib/groupSim';
import { simPoint } from '@/lib/sim';
import { useCompanion } from '@/store/companion';
import { useSimRide } from '@/store/simRide';
import { useBattery } from '@/store/battery';
import { useLocation } from '@/store/location';
import { shouldProbe } from '@/lib/gpsHealth';
import { probePosition } from '@/lib/gpsProbe';
import { startShakeSensor } from '@/lib/shakeSensor';
import { traceBegin, traceEnd } from '@/lib/motionTraceFile';
import { useCrash } from '@/store/crash';
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
  /** Seconds into a simulated ride. It lives outside the effect below so pausing, which restarts that effect, does not send the simulation back to its start. */
  const simClock = useRef(0);
  useEffect(() => {
    if (status !== 'running') { simClock.current = 0; return; }
    // A simulated ride taken up again after the app closed carries on from the seconds already ridden, not from the start of the route.
    const { source: src, elapsedMs } = useRecorder.getState();
    if (src === 'sim' && simClock.current === 0) simClock.current = Math.floor(elapsedMs(Date.now()) / 1000);
  }, [status]);
  useEffect(() => {
    if (status !== 'running') return;
    const { ingest, setBackgrounded } = useRecorder.getState();
    if (source === 'sim') {
      const id = setInterval(() => {
        // In a simulated group ride this phone follows the test route and the other riders play their script, all from the same clock.
        const group = useCompanion.getState().group?.id === SIM_GROUP_ID;
        // The road is the real one to the trail when it was found, else the built-in test loop.
        const road = useSimRide.getState().ride;
        const trail = road?.trail ?? SIM_TRAIL, speed = road ? SIM_ROAD_SPEED_MPS : SIM_SPEED_MPS;
        const i = simClock.current;
        const p = group ? { ...simMePoint(i, trail, speed), t: Date.now(), speed } : { ...simPoint(i, undefined, 0.0045), t: Date.now() };
        if (group) { const { live } = useCompanion.getState(); useCompanion.getState().setLive({ riders: simRiders(i, Date.now(), { name: SIM_ME_NAME, status: live.myStatus }, trail, speed, useSimRide.getState().titles, useSimRide.getState().leader), me: SIM_ME, regroup: simRegroup(trail, road?.name ?? 'Regroup at the lake'), error: undefined }); }
        simClock.current = i + 1;
        // "Low battery" lets the leader's warnings be tried: 18% to begin with, a point lower every five seconds.
        if (useSimRide.getState().lowBattery) useBattery.getState().set(Math.max(3, 18 - Math.floor(i / 5)), false);
        useMotion.getState().feed({ t: p.t, lat: p.lat, lng: p.lng });
        // "Noisy GPS" makes the test behave like a phone: each fix a few metres off, some missed.
        const heard = useSimRide.getState().noisy ? noisyFix(p, Math.random) : p;
        if (heard && !useRecorder.getState().paused) void ingest({ ...p, ...heard });
      }, 1000);
      return () => { clearInterval(id); useMotion.getState().reset(); };
    }
    // A browser tab that goes to the background stops recording; keeping the screen awake helps while it is on screen.
    if (Platform.OS === 'web') void activateKeepAwakeAsync(KEEP_AWAKE).catch(() => undefined);
    // The shared watch always runs: it moves the dot on the map. It records only when the background task cannot.
    const release = useLocation.getState().acquire();
    // Stopped detection runs on every fix and on a clock tick, whether or not the ride is paused.
    const unsubMotion = useLocation.subscribe((s, prev) => { const f = s.fix; if (f && f !== prev.fix) { useMotion.getState().feed({ t: f.t, lat: f.lat, lng: f.lng, speed: f.speed, acc: f.accuracy }); if (f.speed != null && f.speed >= 0) useCrash.getState().feed({ k: 'gps', t: f.t, kmh: f.speed * 3.6 }); } });
    const tick = setInterval(() => { useMotion.getState().refresh(Date.now()); useCrash.getState().feed({ k: 'tick', t: Date.now() }); }, 1000);
    // The phone's shaking tells riding from standing when GPS is poor, and walking from riding.
    const stopShake = startShakeSensor((t, vib, stepHz, peak) => { useMotion.getState().feedShake(t, vib, stepHz); useCrash.getState().feed({ k: 'window', t, peak, stepHz }); }, (t) => useMotion.getState().feedOs(t, 'walking'));
    traceBegin();
    const stopMotion = () => { unsubMotion(); clearInterval(tick); stopShake(); traceEnd(); useMotion.getState().reset(); useCrash.getState().resetDetector(); };
    let cancelled = false;
    let unsub: (() => void) | undefined;
    // On Android the location service stays up while paused or resumed (ingest drops the points while paused) and stops only when the ride ends. Without it the phone may end the app in the background, and the Resume button on the notification then has nothing to answer it.
    const keepService = () => Platform.OS === 'android' && useRecorder.getState().status === 'running';
    // Paused: the map dot keeps moving, but nothing is recorded.
    if (paused) { if (Platform.OS === 'android') void startBackground(); }
    if (paused) return () => { stopMotion(); release(); if (!keepService()) void stopBackground(); if (Platform.OS === 'web') void Promise.resolve(deactivateKeepAwake(KEEP_AWAKE)).catch(() => undefined); };
    // A GPS that goes quiet is asked for a position, not assumed lost: a phone standing still may send nothing for a while. An answer is a fix like any other.
    let probing = false, probedAt = 0;
    const probe = setInterval(() => {
      const now = Date.now();
      if (!shouldProbe({ now, lastSignalAt: Math.max(useRecorder.getState().lastFixAt, useLocation.getState().fixAt ?? 0), probing, lastProbeAt: probedAt })) return;
      probing = true; probedAt = now;
      void probePosition().then((f) => {
        probing = false;
        if (!f || cancelled || useRecorder.getState().paused) return;
        // The watch's subscriber below records it; with the background task running, nothing else would.
        useLocation.setState({ fix: f, fixAt: Date.now() });
        if (useRecorder.getState().backgrounded) void ingest(toPoint(f));
      });
    }, 4000);
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
      clearInterval(probe);
      unsub?.();
      stopMotion();
      release();
      setBackgrounded(false);
      if (!keepService()) void stopBackground();
      if (Platform.OS === 'web') void Promise.resolve(deactivateKeepAwake(KEEP_AWAKE)).catch(() => undefined);
    };
  }, [status, source, paused]);
  return null;
}
