import { create } from 'zustand';

/** This phone's battery: 0 to 100, or null when it is not known (the web build, or a phone that does not say), and whether it is charging. */
export const useBattery = create<{ level: number | null; charging: boolean; set: (level: number | null, charging: boolean) => void }>((set) => ({
  level: null, charging: false,
  set: (level, charging) => set({ level, charging }),
}));
