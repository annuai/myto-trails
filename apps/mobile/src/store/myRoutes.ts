import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LatLng } from '@/lib/geo';
import { uid } from '@/lib/id';
import { storage } from './persist';

/** A route the rider built by tapping the map or imported from a GPX file. It lives on this phone; sharing it is a separate step. */
export type MyRoute = { id: string; name: string; points: LatLng[]; distanceKm: number; createdAt: number; /** Set once it has been shared as a link. */ sharedUrl?: string };

type State = {
  routes: MyRoute[];
  /** The route the next ride follows, when the rider chose one instead of a published trail. */
  followId?: string;
  add: (r: Omit<MyRoute, 'id' | 'createdAt'>) => string;
  remove: (id: string) => void;
  follow: (id: string | undefined) => void;
  setShared: (id: string, url: string) => void;
  wipe: () => void;
};

export const useMyRoutes = create<State>()(
  persist(
    (set) => ({
      routes: [],
      add: (r) => { const id = uid(); set((s) => ({ routes: [{ ...r, id, createdAt: Date.now() }, ...s.routes] })); return id; },
      remove: (id) => set((s) => ({ routes: s.routes.filter((r) => r.id !== id), followId: s.followId === id ? undefined : s.followId })),
      follow: (followId) => set({ followId }),
      setShared: (id, sharedUrl) => set((s) => ({ routes: s.routes.map((r) => (r.id === id ? { ...r, sharedUrl } : r)) })),
      wipe: () => set({ routes: [], followId: undefined }),
    }),
    { name: 'myto-routes', storage },
  ),
);
