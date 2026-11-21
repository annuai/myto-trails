import { create } from 'zustand';
import type { LatLng } from '@/lib/geo';
import type { GroupStatus } from '@/lib/groupCore';

type Place = LatLng & { name?: string };
/** A rider of the group the rider is going to, usually because they asked for help. */
export type Rescue = { riderId: string; name: string; /** What they had signalled when the rider set off, so "all good now" is noticed. */ startStatus: GroupStatus };

/**
 * Where the ride screen is guiding to. `to` is a place the rider asked for ("Navigate with Myto"). `rescue` is a rider of the group they have
 * gone to help: it comes first, and when it ends ("Continue the ride") the screen goes back to `to`, the route or the group's destination,
 * which were never cleared. `paused` is the place the rider stopped guiding to ("Stop guiding"): kept so the ride screen can offer to guide
 * there again instead of losing it for good. Everything clears when the ride ends.
 */
export const useGuideTarget = create<{
  to?: Place; rescue?: Rescue; paused?: Place;
  set: (to: Place) => void; clear: () => void; pause: () => void; resume: () => void; /** The rider's own place goes, the rider being helped stays: the leader of the group changed the destination, so the group's comes back. */ dropPersonal: () => void;
  startRescue: (r: Rescue) => void; endRescue: () => void;
}>((set) => ({
  set: (to) => set({ to, paused: undefined }),
  clear: () => set({ to: undefined, rescue: undefined, paused: undefined }),
  pause: () => set((s) => (s.to ? { to: undefined, paused: s.to } : {})),
  dropPersonal: () => set({ to: undefined, paused: undefined }),
  resume: () => set((s) => (s.paused ? { to: s.paused, paused: undefined } : {})),
  startRescue: (rescue) => set({ rescue }),
  endRescue: () => set({ rescue: undefined }),
}));
