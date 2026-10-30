import { Platform } from 'react-native';
import { Accelerometer, Pedometer } from 'expo-sensors';
import { summariseWindow, type Sample } from './motionFusion';

const RATE_MS = 100;
const WINDOW_MS = 2000;

/**
 * Starts reading the accelerometer at about 10 Hz and calls `onWindow` every two seconds with the phone's shaking and its hardest knock (`peak`, in g, for crash detection). The phone's step
 * counter, where the rider allows motion data, calls `onWalking` when steps are being taken. Without that permission only the
 * accelerometer is used. Returns a stop function. Does nothing in a browser.
 */
export function startShakeSensor(onWindow: (t: number, vib: number, stepHz: number, peak: number) => void, onWalking: (t: number) => void): () => void {
  if (Platform.OS === 'web') return () => undefined;
  let steps: { remove: () => void } | undefined;
  let stopped = false;
  void (async () => {
    try {
      if (!(await Pedometer.isAvailableAsync())) return;
      const got = await Pedometer.requestPermissionsAsync();
      if (!got.granted || stopped) return;
      steps = Pedometer.watchStepCount(() => onWalking(Date.now()));
    } catch { /* no step counter: the accelerometer carries on alone */ }
  })();
  let buf: Sample[] = [];
  let peak = 0;
  Accelerometer.setUpdateInterval(RATE_MS);
  const sub = Accelerometer.addListener(({ x, y, z }) => {
    const t = Date.now();
    buf.push({ t, x, y, z });
    peak = Math.max(peak, Math.hypot(x, y, z));
    if (t - buf[0]!.t >= WINDOW_MS) { const { vib, stepHz } = summariseWindow(buf); buf = []; const hardest = peak; peak = 0; onWindow(t, vib, stepHz, hardest); }
  });
  return () => { stopped = true; sub.remove(); steps?.remove(); };
}
