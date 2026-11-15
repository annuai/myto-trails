import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_PREFS, type RoutePrefs } from '@/lib/routing';
import { storage } from './persist';

type State = RoutePrefs & {
  /** Turns are read aloud on the ride screen and in full-screen directions. On unless the rider turns it off. */
  voice: boolean;
  set: (p: Partial<RoutePrefs & { voice: boolean }>) => void;
};

/** How the rider likes roads chosen, sent with every route asked for; and whether directions are spoken. */
export const useRoutePrefs = create<State>()(
  persist(
    (set) => ({ ...DEFAULT_PREFS, voice: true, set: (p) => set(p) }),
    { name: 'myto-route-prefs', storage, partialize: ({ set: _s, ...rest }) => rest as State },
  ),
);

/** The preferences alone, for a routing request. */
export const routePrefs = (): RoutePrefs => {
  const { avoidHighways, avoidTolls, avoidFerries, smallerRoads, allowUnpaved } = useRoutePrefs.getState();
  return { avoidHighways, avoidTolls, avoidFerries, smallerRoads, allowUnpaved };
};
