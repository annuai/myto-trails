import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/api/client';
import { headline } from '@/api/status';
import type { RouteDto, TrailDetail } from '@/api/types';
import type { Status } from '@/ui/Chip';
import { storage } from './persist';

export type Offline = { detail: TrailDetail; route: RouteDto | null; savedAt: number; bytes: number };
export type NextTrip = { slug: string; name: string; status: Status; statusLabel: string; date?: string };

type State = {
  offline: Record<string, Offline>;
  downloading: Record<string, true>;
  nextTrip?: NextTrip;
  planTrip: (detail: TrailDetail, date?: string) => void;
  cancelPlan: () => void;
  download: (slug: string) => Promise<void>;
  removeDownload: (slug: string) => void;
  clear: () => void;
};

/** An offline pack saves the trail's details, access and condition, and its route. Map tiles still need a connection. */
export const useTrailStore = create<State>()(
  persist(
    (set, get) => ({
      offline: {}, downloading: {},
      planTrip: (d, date) => { const h = headline(d); set({ nextTrip: { slug: d.slug, name: d.name, status: h.status, statusLabel: h.label, date } }); },
      cancelPlan: () => set({ nextTrip: undefined }),
      download: async (slug) => {
        if (get().downloading[slug]) return;
        set((s) => ({ downloading: { ...s.downloading, [slug]: true } }));
        try {
          const [detail, route] = await Promise.all([
            api<TrailDetail>(`/trails/${slug}`),
            api<RouteDto>(`/trails/${slug}/route`).catch(() => null), // sensitive trails publish no line
          ]);
          const bytes = JSON.stringify({ detail, route }).length;
          set((s) => ({ offline: { ...s.offline, [slug]: { detail, route, savedAt: Date.now(), bytes } } }));
        } finally {
          set((s) => { const { [slug]: _x, ...rest } = s.downloading; return { downloading: rest }; });
        }
      },
      removeDownload: (slug) => set((s) => { const { [slug]: _x, ...rest } = s.offline; return { offline: rest }; }),
      clear: () => set({ offline: {}, downloading: {}, nextTrip: undefined }),
    }),
    { name: 'myto-trails', storage, partialize: (s) => ({ offline: s.offline, nextTrip: s.nextTrip }) },
  ),
);
