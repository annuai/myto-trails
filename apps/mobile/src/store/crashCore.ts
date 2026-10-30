import type { StateCreator } from 'zustand';
import { COUNTDOWN_MS } from '@/lib/crashAlert';
import { initialCrash, stepCrash, type CrashEvidence, type CrashState } from '@/lib/crashDetect';

/** `countdown`: asking "Are you OK?". `alerted`: nobody answered and the alert went out. `test` runs the same screens and tells no one. */
export type CrashPhase = 'idle' | 'countdown' | 'alerted';

export type CrashStore = {
  /** Crash detection is opt-in. */
  enabled: boolean;
  phase: CrashPhase;
  test: boolean;
  deadline: number;
  detector: CrashState;
  setEnabled: (on: boolean) => void;
  /** Evidence from the sensors while a ride is recording. Ignored while the switch is off or an alert is already showing. */
  feed: (e: CrashEvidence) => void;
  begin: (now: number, test?: boolean) => void;
  /** The rider says they are OK, or closes the alert. */
  cancel: () => void;
  /** The clock: when the countdown runs out, the alert goes out. */
  tick: (now: number) => void;
  /** The ride ended or stopped: forget what the detector has seen. */
  resetDetector: () => void;
};

export const crashSlice = (): StateCreator<CrashStore> => (set, get) => ({
    enabled: false, phase: 'idle', test: false, deadline: 0, detector: initialCrash,
    setEnabled: (enabled) => set({ enabled }),
    feed: (e) => {
      const s = get();
      if (!s.enabled || s.phase !== 'idle') return;
      const r = stepCrash(s.detector, e);
      if (r.crash) set({ detector: initialCrash, phase: 'countdown', test: false, deadline: e.t + COUNTDOWN_MS });
      else set({ detector: r.state });
    },
    begin: (now, test = false) => set({ phase: 'countdown', test, deadline: now + COUNTDOWN_MS, detector: initialCrash }),
    cancel: () => set({ phase: 'idle', test: false, deadline: 0 }),
    tick: (now) => { const s = get(); if (s.phase === 'countdown' && now >= s.deadline) set({ phase: 'alerted' }); },
    resetDetector: () => set({ detector: initialCrash }),
});
