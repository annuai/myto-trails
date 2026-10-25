import { create } from 'zustand';

/** Counts open sheets, so the floating tab bar can step aside instead of covering a sheet's buttons. */
export const useChrome = create<{ sheets: number; open: () => void; close: () => void }>((set) => ({
  sheets: 0,
  open: () => set((s) => ({ sheets: s.sheets + 1 })),
  close: () => set((s) => ({ sheets: Math.max(0, s.sheets - 1) })),
}));
