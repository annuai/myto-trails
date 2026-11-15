import type { Adapter, Item } from './syncCore';
import { encodeTrack } from './trackCodec';
import { newestFirst } from '@/lib/ridesOrder';
import { useRides, type Ride } from '@/store/rides';
import { useTodos } from '@/store/todos';
import { useTrips, type Trip } from '@/store/trips';
import type { Todo } from '@/lib/todos';
import type { LatLng } from '@/lib/geo';

const clean = <T extends Record<string, unknown>>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/** A ride without its points (they travel as a track), its review state or its upload id: those belong to this phone. */
function rideItem(r: Ride): Item {
  const { points: _p, breaks: _b, submission: _s, clientId: _c, updatedAt, id, sample: _sample, ...data } = r;
  return { id, updatedAt: updatedAt ?? r.startedAt + r.durationSec * 1000, data: clean(data) };
}

export const ridesAdapter: Adapter = {
  kind: 'ride',
  list: () => useRides.getState().rides.filter((r) => !r.sample).map(rideItem),
  get: (id) => { const r = useRides.getState().rides.find((x) => x.id === id); return r && !r.sample ? rideItem(r) : undefined; },
  put(id, data, updatedAt, extra) {
    useRides.setState((s) => {
      const cur = s.rides.find((r) => r.id === id);
      const next = clean({ submission: cur?.submission, clientId: cur?.clientId, ...data, id, updatedAt, points: (extra?.points as LatLng[] | undefined) ?? cur?.points ?? [], breaks: extra?.breaks ?? cur?.breaks }) as unknown as Ride;
      // A ride pulled from another phone goes where its date puts it, not on top: older rides pulled later used to bury the newest.
      return { rides: cur ? s.rides.map((r) => (r.id === id ? next : r)) : newestFirst([next, ...s.rides]) };
    });
  },
  remove: (id) => useRides.setState((s) => ({ rides: s.rides.filter((r) => r.id !== id) })),
  rekey: (from, to, suffix) => useRides.setState((s) => ({ rides: s.rides.map((r) => (r.id === from ? { ...r, id: to, name: `${r.name}${suffix}`.slice(0, 80), updatedAt: Date.now() } : r)) })),
  track: (id) => { const r = useRides.getState().rides.find((x) => x.id === id); return r && r.points.length > 0 ? encodeTrack(r.points, r.breaks) : null; },
};

const todoItem = (t: Todo): Item => { const { id, updatedAt, ...data } = t; return { id, updatedAt, data: clean(data) }; };
export const todosAdapter: Adapter = {
  kind: 'todo',
  list: () => useTodos.getState().todos.map(todoItem),
  get: (id) => { const t = useTodos.getState().todos.find((x) => x.id === id); return t ? todoItem(t) : undefined; },
  put(id, data, updatedAt) {
    const next = { ...data, id, updatedAt } as unknown as Todo;
    useTodos.setState((s) => ({ todos: s.todos.some((t) => t.id === id) ? s.todos.map((t) => (t.id === id ? next : t)) : [...s.todos, next] }));
  },
  remove: (id) => useTodos.setState((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
};

const tripItem = (t: Trip): Item => { const { id, ...data } = t; return { id, data: clean(data) }; };
export const tripsAdapter: Adapter = {
  kind: 'trip',
  list: () => useTrips.getState().trips.map(tripItem),
  get: (id) => { const t = useTrips.getState().trips.find((x) => x.id === id); return t ? tripItem(t) : undefined; },
  put(id, data) {
    const next = { ...data, id } as unknown as Trip;
    useTrips.setState((s) => ({ trips: s.trips.some((t) => t.id === id) ? s.trips.map((t) => (t.id === id ? next : t)) : [next, ...s.trips] }));
  },
  remove: (id) => useTrips.setState((s) => ({ trips: s.trips.filter((t) => t.id !== id) })),
};

/** Moments will join this list when they have a store of their own. The server already accepts them. */
export const syncAdapters: Adapter[] = [ridesAdapter, tripsAdapter, todosAdapter];
