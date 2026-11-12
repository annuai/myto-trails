import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage } from './persist';

type State = {
  /** The moments that have already played (a ride's inking, a count-up), by id, with when. A moment plays once, then the screen just shows its final state. */
  played: Record<string, number>;
  mark: (id: string) => void;
  /** The last figure shown for something that rolls (a total in km), so the next visit rolls from there. */
  last: Record<string, number>;
  remember: (id: string, value: number) => void;
};

export const useSeen = create<State>()(
  persist(
    (set) => ({
      played: {}, mark: (id) => set((s) => (s.played[id] ? s : { played: { ...s.played, [id]: Date.now() } })),
      last: {}, remember: (id, value) => set((s) => (s.last[id] === value ? s : { last: { ...s.last, [id]: value } })),
    }),
    { name: 'myto-seen', storage, partialize: (s) => ({ played: s.played, last: s.last }) },
  ),
);

/** Whether a moment is new: not played yet, and the store has loaded (before it has, nothing plays, so a slow load never replays old moments). */
export const isNew = (id: string): boolean => useSeen.persist.hasHydrated() && !useSeen.getState().played[id];
