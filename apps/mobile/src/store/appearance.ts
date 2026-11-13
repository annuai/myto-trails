import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage } from './persist';

type State = {
  /** Every colour is swapped for its opposite: the ride screen turns light and the other screens turn dark. */
  inverted: boolean;
  setInverted: (inverted: boolean) => void;
  /** Taps and vibration for checks, finished tasks and milestones. On unless the rider turns it off. */
  haptics: boolean;
  setHaptics: (on: boolean) => void;
  /** A soft tick each time the live speed passes a multiple of 10 on the ride screen, and as numbers roll. Needs `haptics`. */
  speedTicks: boolean;
  setSpeedTicks: (on: boolean) => void;
  /** Anonymous crash reports (no position, no contacts: see `scrubCrashEvent`). On unless the rider turns it off. */
  crashReports: boolean;
  setCrashReports: (on: boolean) => void;
};

export const useAppearance = create<State>()(
  persist(
    (set) => ({
      inverted: false, setInverted: (inverted) => set({ inverted }),
      haptics: true, setHaptics: (haptics) => set({ haptics }),
      speedTicks: true, setSpeedTicks: (speedTicks) => set({ speedTicks }),
      crashReports: true, setCrashReports: (crashReports) => set({ crashReports }),
    }),
    { name: 'myto-appearance', storage, partialize: (s) => ({ inverted: s.inverted, haptics: s.haptics, speedTicks: s.speedTicks, crashReports: s.crashReports }) },
  ),
);
