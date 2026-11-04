import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage } from './persist';

export type PreRideCheck = { at: number; /** Check item ids the rider said need fixing. */ flagged: string[] };

type State = {
  /** The last pre-ride check. */
  last: PreRideCheck | null;
  /** Tool ids the rider has packed. */
  packed: Record<string, true>;
  /** How many times the rider has fixed each thing, by guide id. Theirs alone: it is not sent anywhere. */
  fixed: Record<string, number>;
  saveCheck: (flagged: string[], now: number) => void;
  togglePacked: (toolId: string) => void;
  markFixed: (guideId: string) => void;
  /** Used by "Erase all my data". */
  wipe: () => void;
};

export const useFixit = create<State>()(
  persist(
    (set) => ({
      last: null, packed: {}, fixed: {},
      saveCheck: (flagged, now) => set({ last: { at: now, flagged } }),
      togglePacked: (id) => set((s) => { const { [id]: had, ...rest } = s.packed; return { packed: had ? rest : { ...rest, [id]: true } }; }),
      markFixed: (id) => set((s) => ({ fixed: { ...s.fixed, [id]: (s.fixed[id] ?? 0) + 1 } })),
      wipe: () => set({ last: null, packed: {}, fixed: {} }),
    }),
    { name: 'myto-fixit', storage },
  ),
);

export const totalFixed = (fixed: Record<string, number>) => Object.values(fixed).reduce((n, v) => n + v, 0);
