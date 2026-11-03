import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage } from './persist';

type State = {
  /** Every colour is swapped for its opposite: the ride screen turns light and the other screens turn dark. */
  inverted: boolean;
  setInverted: (inverted: boolean) => void;
};

export const useAppearance = create<State>()(
  persist(
    (set) => ({ inverted: false, setInverted: (inverted) => set({ inverted }) }),
    { name: 'myto-appearance', storage, partialize: (s) => ({ inverted: s.inverted }) },
  ),
);
