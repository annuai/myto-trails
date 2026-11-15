import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Bike } from '@/api/types';
import { storage } from './persist';

/** The rider's selected bike, kept on the phone so the You page shows it at once (and offline) instead of waiting for the server. Cleared on sign-out. */
export const useMyBikeStore = create<{ bike: Bike | null | undefined; set: (bike: Bike | null) => void; reset: () => void }>()(persist(
  (set) => ({ bike: undefined, set: (bike) => set({ bike }), reset: () => set({ bike: undefined }) }),
  { name: 'myto-my-bike', storage },
));
