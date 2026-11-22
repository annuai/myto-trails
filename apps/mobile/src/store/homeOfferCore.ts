import type { StateCreator } from 'zustand';

const KEEP = 10;

/** When the rider dismissed the "Ride home" offer (ms), oldest first, last 10 only. Kept on the phone. */
export type HomeOfferState = {
  dismissals: number[];
  dismiss: (now?: number) => void;
  clear: () => void;
};

/** The store's actions and starting state, separate from persistence so they can be tested. */
export const homeOfferSlice = (): StateCreator<HomeOfferState> => (set) => ({
  dismissals: [],
  dismiss: (now = Date.now()) => set((s) => ({ dismissals: [...s.dismissals, now].slice(-KEEP) })),
  clear: () => set({ dismissals: [] }),
});
