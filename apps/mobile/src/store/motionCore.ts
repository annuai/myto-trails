import { create } from 'zustand';
import { initialFusion, stepFusion, type Activity, type Evidence, type Fusion, type OsActivity } from '@/lib/motionFusion';
import type { MotionFix } from '@/lib/motion';

/** Evidence older than this means the answer is unknown, so not stopped. */
const STALE_MS = 5000;
const SURE = 0.6;

type State = {
  fusion: Fusion;
  /** What the detector thinks the rider is doing (see lib/motionFusion). */
  activity: Activity;
  /** True only when the rider is reliably stopped or on foot. Screens read this to decide whether typing is allowed, and the break, auto-pause and stop prompts act on it. */
  stopped: boolean;
  /** A GPS fix. */
  feed: (f: MotionFix) => void;
  /** A window of the phone's shaking, from the accelerometer. */
  feedShake: (t: number, vib: number, stepHz: number) => void;
  /** What the phone's activity recognition says, where it has any. */
  feedOs: (t: number, activity: OsActivity) => void;
  /** Re-evaluates against the clock, so a stop expires when evidence stops arriving. */
  refresh: (now: number) => void;
  reset: () => void;
};

const calm = (f: Fusion, now: number) => (f.state === 'stopped_brief' || f.state === 'stopped_parked' || f.state === 'on_foot') && f.confidence >= SURE && now - f.lastAt <= STALE_MS;

/** `onEvidence` sees each piece of evidence with the state it led to, for the motion trace. */
export function createMotionStore(onEvidence?: (e: Evidence, after: Fusion) => void) {
  return create<State>((set, get) => {
    const apply = (e: Evidence) => {
      const fusion = stepFusion(get().fusion, e);
      onEvidence?.(e, fusion);
      const stopped = calm(fusion, e.t);
      if (e.k === 'tick' && fusion.state === get().activity && stopped === get().stopped) { set({ fusion }); return; }
      set({ fusion, activity: fusion.state, stopped });
    };
    return {
      fusion: initialFusion, activity: 'unknown', stopped: false,
      feed: (f) => apply({ k: 'gps', t: f.t, lat: f.lat, lng: f.lng, speed: f.speed, acc: f.acc }),
      feedShake: (t, vib, stepHz) => apply({ k: 'shake', t, vib, stepHz }),
      feedOs: (t, activity) => apply({ k: 'os', t, activity }),
      refresh: (now) => apply({ k: 'tick', t: now }),
      reset: () => set({ fusion: initialFusion, activity: 'unknown', stopped: false }),
    };
  });
}
