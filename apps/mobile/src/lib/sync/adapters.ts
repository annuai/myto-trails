import type { Adapter, ApplyOp, Item } from './syncCore';
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

/** A ride as it is stored after another phone's copy arrives: its data and points, with this phone's own review state kept. */
function buildRide(cur: Ride | undefined, id: string, data: Record<string, unknown>, updatedAt: number, extra?: { points?: unknown; breaks?: number[] }): Ride {
  return clean({ submission: cur?.submission, clientId: cur?.clientId, ...data, id, updatedAt, points: (extra?.points as LatLng[] | undefined) ?? cur?.points ?? [], breaks: extra?.breaks ?? cur?.breaks }) as unknown as Ride;
}

/** How sync reads and writes rides. Sample rides are not synced. */
export const ridesAdapter: Adapter = {
  kind: 'ride',
  list: () => useRides.getState().rides.filter((r) => !r.sample).map(rideItem),
  get: (id) => { const r = useRides.getState().rides.find((x) => x.id === id); return r && !r.sample ? rideItem(r) : undefined; },
  put(id, data, updatedAt, extra) {
    useRides.setState((s) => {
      const cur = s.rides.find((r) => r.id === id);
      const next = buildRide(cur, id, data, updatedAt, extra);
      // A ride pulled from another phone goes where its date puts it, not on top: older rides pulled later used to bury the newest.
      return { rides: cur ? s.rides.map((r) => (r.id === id ? next : r)) : newestFirst([next, ...s.rides]) };
    });
  },
  applyMany: (ops) => useRides.setState((s) => {
    const gone = new Set(ops.filter((o) => o.type === 'remove').map((o) => o.id));
    const puts = new Map(ops.flatMap((o) => (o.type === 'put' ? [[o.id, o] as const] : [])));
    const seen = new Set<string>();
    const kept = s.rides.filter((r) => !gone.has(r.id)).map((r) => {
      const o = puts.get(r.id);
      if (!o) return r;
      seen.add(r.id);
      return buildRide(r, o.id, o.data, o.updatedAt, o.extra);
    });
    const added = [...puts.values()].filter((o) => !seen.has(o.id)).map((o) => buildRide(undefined, o.id, o.data, o.updatedAt, o.extra));
    return { rides: added.length ? newestFirst([...added, ...kept]) : kept };
  }),
  remove: (id) => useRides.setState((s) => ({ rides: s.rides.filter((r) => r.id !== id) })),
  rekey: (from, to, suffix) => useRides.setState((s) => ({ rides: s.rides.map((r) => (r.id === from ? { ...r, id: to, name: `${r.name}${suffix}`.slice(0, 80), updatedAt: Date.now() } : r)) })),
  track: (id) => { const r = useRides.getState().rides.find((x) => x.id === id); return r && r.points.length > 0 ? encodeTrack(r.points, r.breaks) : null; },
};

type PutOp = Extract<ApplyOp, { type: 'put' }>;
const split = (ops: ApplyOp[]) => ({
  gone: new Set(ops.filter((o) => o.type === 'remove').map((o) => o.id)),
  puts: new Map(ops.flatMap((o): [string, PutOp][] => (o.type === 'put' ? [[o.id, o]] : []))),
});

const todoItem = (t: Todo): Item => { const { id, updatedAt, ...data } = t; return { id, updatedAt, data: clean(data) }; };
/** How sync reads and writes to-dos. */
export const todosAdapter: Adapter = {
  kind: 'todo',
  list: () => useTodos.getState().todos.map(todoItem),
  get: (id) => { const t = useTodos.getState().todos.find((x) => x.id === id); return t ? todoItem(t) : undefined; },
  put(id, data, updatedAt) {
    const next = { ...data, id, updatedAt } as unknown as Todo;
    useTodos.setState((s) => ({ todos: s.todos.some((t) => t.id === id) ? s.todos.map((t) => (t.id === id ? next : t)) : [...s.todos, next] }));
  },
  remove: (id) => useTodos.setState((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
  applyMany: (ops) => useTodos.setState((s) => {
    const { gone, puts } = split(ops);
    const seen = new Set<string>();
    const kept = s.todos.filter((t) => !gone.has(t.id)).map((t) => { const o = puts.get(t.id); if (!o) return t; seen.add(t.id); return { ...o.data, id: t.id, updatedAt: o.updatedAt } as unknown as Todo; });
    const added = [...puts.values()].filter((o) => !seen.has(o.id)).map((o) => ({ ...o.data, id: o.id, updatedAt: o.updatedAt }) as unknown as Todo);
    return { todos: [...kept, ...added] };
  }),
};

const tripItem = (t: Trip): Item => { const { id, ...data } = t; return { id, data: clean(data) }; };
/** How sync reads and writes trips. */
export const tripsAdapter: Adapter = {
  kind: 'trip',
  list: () => useTrips.getState().trips.map(tripItem),
  get: (id) => { const t = useTrips.getState().trips.find((x) => x.id === id); return t ? tripItem(t) : undefined; },
  put(id, data) {
    const next = { ...data, id } as unknown as Trip;
    useTrips.setState((s) => ({ trips: s.trips.some((t) => t.id === id) ? s.trips.map((t) => (t.id === id ? next : t)) : [next, ...s.trips] }));
  },
  remove: (id) => useTrips.setState((s) => ({ trips: s.trips.filter((t) => t.id !== id) })),
  applyMany: (ops) => useTrips.setState((s) => {
    const { gone, puts } = split(ops);
    const seen = new Set<string>();
    const kept = s.trips.filter((t) => !gone.has(t.id)).map((t) => { const o = puts.get(t.id); if (!o) return t; seen.add(t.id); return { ...o.data, id: t.id } as unknown as Trip; });
    const added = [...puts.values()].filter((o) => !seen.has(o.id)).map((o) => ({ ...o.data, id: o.id }) as unknown as Trip);
    return { trips: [...added, ...kept] };
  }),
};

/** Moments will join this list when they have a store of their own. The server already accepts them. */
export const syncAdapters: Adapter[] = [ridesAdapter, tripsAdapter, todosAdapter];
