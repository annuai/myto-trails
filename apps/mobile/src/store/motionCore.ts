import { create } from 'zustand';
import { initialMotion, isStopped, stepMotion, type MotionFix, type MotionState } from '@/lib/motion';

type State = {
  state: MotionState;
  /** True only when the vehicle is reliably stopped (see lib/motion). Screens read this to decide whether typing is allowed. */
  stopped: boolean;
  feed: (f: MotionFix) => void;
  /** Re-evaluates against the clock, so a stop expires when fixes stop arriving. */
  refresh: (now: number) => void;
  reset: () => void;
};

export function createMotionStore() {
  return create<State>((set, get) => ({
    state: initialMotion, stopped: false,
    feed: (f) => { const state = stepMotion(get().state, f); set({ state, stopped: isStopped(state, f.t) }); },
    refresh: (now) => { const stopped = isStopped(get().state, now); if (stopped !== get().stopped) set({ stopped }); },
    reset: () => set({ state: initialMotion, stopped: false }),
  }));
}
