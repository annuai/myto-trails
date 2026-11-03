import { create } from 'zustand';
import type { EventRole } from '@/api/types';
import type { SimRide } from '@/lib/simRide';

/** The road a simulated group ride follows, when a real one was found. Without it the simulation rides its built-in test loop. */
export const useSimRide = create<{ ride?: SimRide; /** Titles the leader has given the made-up riders, by rider id (an empty list is none). A rider not here keeps the ones the script gave them. */ titles: Record<string, EventRole[]>; setTitles: (id: string, t: EventRole[]) => void; /** Test the live map the way a real phone's GPS behaves: fixes a few metres off, some missed. */ noisy: boolean; set: (r: SimRide) => void; clear: () => void; setNoisy: (n: boolean) => void }>((set) => ({
  noisy: false,
  titles: {},
  setTitles: (id, t) => set((s) => ({ titles: { ...s.titles, [id]: t } })),
  set: (ride) => set({ ride }),
  clear: () => set({ ride: undefined, titles: {} }),
  setNoisy: (noisy) => set({ noisy }),
}));
