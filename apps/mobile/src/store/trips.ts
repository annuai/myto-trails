import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { todayISO } from '@/lib/dates';
import { uid } from '@/lib/id';
import { newItems, STARTER_ITEMS, type ChecklistItem } from '@/lib/tripChecklist';
import { DEFAULT_START_TIME, resizeDays, tripStatus, type TripDay, type TripRoute } from '@/lib/tripPlan';
import { storage } from './persist';
import { useTodos } from './todos';

/**
 * A trip: a name, a start date and some days, each with a route. The rides recorded on it, and its pack list (which are to-dos
 * due on the start date), belong to it. A trip with no start date is an older one that only gathers rides.
 */
export type Trip = {
  id: string; name: string; rideIds: string[]; createdAt: number;
  startDate?: string; days?: TripDay[];
  /** Minutes after midnight that each day starts: the rider is reminded 10 minutes before. */
  startTime?: number;
  /** Set when the rider pressed Start trip. A trip only runs once they do. */
  startedAt?: number; endedAt?: number;
  /** An older pack list, from before pack items became to-dos. Nothing reads it. */
  items?: ChecklistItem[];
};

export type NewTrip = { name: string; startDate?: string; startTime?: number; dayCount?: number; route?: TripRoute };

type State = {
  trips: Trip[];
  create: (t: NewTrip) => string;
  /** Rename, move the start date (its pack to-dos move with it) or change how many days it has. */
  update: (id: string, patch: { name?: string; startDate?: string; startTime?: number; dayCount?: number }) => void;
  setDay: (id: string, dayId: string, patch: Partial<Pick<TripDay, 'note' | 'route'>>) => void;
  addTodos: (id: string, titles: string[]) => void;
  addStarterTodos: (id: string) => void;
  start: (id: string) => void;
  end: (id: string) => void;
  remove: (id: string) => void;
  addRide: (tripId: string, rideId: string) => void;
  removeRide: (tripId: string, rideId: string) => void;
  /** A ride that just finished joins the trip that is under way, if there is one. */
  attachToActive: (rideId: string) => void;
  /** A deleted ride leaves every trip it was in. */
  forgetRide: (rideId: string) => void;
  wipe: () => void;
};

const mapTrip = (id: string, f: (t: Trip) => Trip) => (s: State) => ({ trips: s.trips.map((t) => (t.id === id ? f(t) : t)) });

export const useTrips = create<State>()(
  persist(
    (set, get) => ({
      trips: [],
      create: ({ name, startDate, startTime, dayCount = 1, route }) => {
        const id = uid();
        const days = resizeDays(undefined, dayCount, uid);
        if (route) days[0] = { ...days[0]!, route };
        set((s) => ({ trips: [{ id, name: name.trim() || 'My trip', rideIds: [], createdAt: Date.now(), ...(startDate ? { startDate, startTime: startTime ?? DEFAULT_START_TIME, days } : {}) }, ...s.trips] }));
        return id;
      },
      update: (id, patch) => {
        set(mapTrip(id, (t) => ({
          ...t,
          ...(patch.name?.trim() ? { name: patch.name.trim() } : {}),
          ...(patch.startDate ? { startDate: patch.startDate } : {}),
          ...(patch.startTime !== undefined ? { startTime: patch.startTime } : {}),
          ...(patch.dayCount ? { days: resizeDays(t.days, patch.dayCount, uid) } : {}),
        })));
        // The pack to-dos are due on the start date wherever it moves to.
        if (patch.startDate) useTodos.setState((s) => ({ todos: s.todos.map((x) => (x.tripId === id ? { ...x, due: patch.startDate, updatedAt: Date.now() } : x)) }));
      },
      setDay: (id, dayId, patch) => set(mapTrip(id, (t) => ({ ...t, days: t.days?.map((d) => (d.id === dayId ? { ...d, ...patch } : d)) }))),
      addTodos: (id, titles) => {
        const trip = get().trips.find((t) => t.id === id);
        if (!trip) return;
        const mine = useTodos.getState().todos.filter((t) => t.tripId === id).map((t) => t.title);
        for (const title of newItems(mine, titles)) useTodos.getState().add({ title, category: 'pack', kind: 'date', ...(trip.startDate ? { due: trip.startDate } : {}), source: `trip:${id}`, tripId: id });
      },
      addStarterTodos: (id) => get().addTodos(id, STARTER_ITEMS),
      start: (id) => set(mapTrip(id, (t) => (t.startedAt ? t : { ...t, startedAt: Date.now() }))),
      end: (id) => set(mapTrip(id, (t) => (t.endedAt ? t : { ...t, endedAt: Date.now() }))),
      remove: (id) => { useTodos.setState((s) => ({ todos: s.todos.filter((t) => t.tripId !== id) })); set((s) => ({ trips: s.trips.filter((t) => t.id !== id) })); },
      addRide: (tripId, rideId) => set(mapTrip(tripId, (t) => (t.rideIds.includes(rideId) ? t : { ...t, rideIds: [...t.rideIds, rideId] }))),
      removeRide: (tripId, rideId) => set(mapTrip(tripId, (t) => ({ ...t, rideIds: t.rideIds.filter((r) => r !== rideId) }))),
      attachToActive: (rideId) => { const t = get().trips.find((x) => tripStatus(x, todayISO()) === 'active'); if (t) get().addRide(t.id, rideId); },
      forgetRide: (rideId) => set((s) => ({ trips: s.trips.map((t) => ({ ...t, rideIds: t.rideIds.filter((r) => r !== rideId) })) })),
      wipe: () => set({ trips: [] }),
    }),
    { name: 'myto-trips', storage },
  ),
);
