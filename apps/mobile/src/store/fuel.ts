import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { todayISO } from '@/lib/dates';
import { upsertSetting, type FuelSetting } from '@/lib/fuelCost';
import { storage } from './persist';

type State = {
  /** The bike's economy and the petrol price, each from a date. Rides use the one in force the day they started. */
  history: FuelSetting[];
  /** Sets the economy and price from today on. Earlier rides keep what they had. */
  save: (kmPerLitre: number, pricePerLitre: number, from?: string) => void;
  /** Used by backup restore. */
  restore: (history: FuelSetting[]) => void;
  wipe: () => void;
};

export const useFuel = create<State>()(
  persist(
    (set) => ({
      history: [],
      save: (kmPerLitre, pricePerLitre, from = todayISO()) => set((s) => ({ history: upsertSetting(s.history, { from, kmPerLitre, pricePerLitre }) })),
      restore: (history) => set({ history }),
      wipe: () => set({ history: [] }),
    }),
    { name: 'myto-fuel', storage },
  ),
);
