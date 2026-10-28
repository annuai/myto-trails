import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '@/lib/id';
import { STARTER_ITEMS, withItems, type ChecklistItem } from '@/lib/tripChecklist';
import { storage } from './persist';

/** A trip of several days: a name and the rides in it. The rides stay in the ride log; a trip only points at them. */
export type Trip = { id: string; name: string; rideIds: string[]; createdAt: number; /** What to pack for it. Trips made before checklists existed have none. */ items?: ChecklistItem[] };

type State = {
  trips: Trip[];
  create: (name: string, rideId?: string) => string;
  addRide: (tripId: string, rideId: string) => void;
  removeRide: (tripId: string, rideId: string) => void;
  remove: (tripId: string) => void;
  addItems: (tripId: string, texts: string[]) => void;
  addStarterItems: (tripId: string) => void;
  toggleItem: (tripId: string, itemId: string) => void;
  removeItem: (tripId: string, itemId: string) => void;
  /** A deleted ride leaves every trip it was in. */
  forgetRide: (rideId: string) => void;
  wipe: () => void;
};

export const useTrips = create<State>()(
  persist(
    (set) => ({
      trips: [],
      create: (name, rideId) => { const id = uid(); set((s) => ({ trips: [{ id, name: name.trim() || 'My trip', rideIds: rideId ? [rideId] : [], createdAt: Date.now() }, ...s.trips] })); return id; },
      addRide: (tripId, rideId) => set((s) => ({ trips: s.trips.map((t) => (t.id === tripId && !t.rideIds.includes(rideId) ? { ...t, rideIds: [...t.rideIds, rideId] } : t)) })),
      removeRide: (tripId, rideId) => set((s) => ({ trips: s.trips.map((t) => (t.id === tripId ? { ...t, rideIds: t.rideIds.filter((r) => r !== rideId) } : t)) })),
      addItems: (tripId, texts) => set((s) => ({ trips: s.trips.map((t) => (t.id === tripId ? { ...t, items: withItems(t.items, texts) } : t)) })),
      addStarterItems: (tripId) => set((s) => ({ trips: s.trips.map((t) => (t.id === tripId ? { ...t, items: withItems(t.items, STARTER_ITEMS) } : t)) })),
      toggleItem: (tripId, itemId) => set((s) => ({ trips: s.trips.map((t) => (t.id === tripId ? { ...t, items: t.items?.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) } : t)) })),
      removeItem: (tripId, itemId) => set((s) => ({ trips: s.trips.map((t) => (t.id === tripId ? { ...t, items: t.items?.filter((i) => i.id !== itemId) } : t)) })),
      remove: (tripId) => set((s) => ({ trips: s.trips.filter((t) => t.id !== tripId) })),
      forgetRide: (rideId) => set((s) => ({ trips: s.trips.map((t) => ({ ...t, rideIds: t.rideIds.filter((r) => r !== rideId) })) })),
      wipe: () => set({ trips: [] }),
    }),
    { name: 'myto-trips', storage },
  ),
);
