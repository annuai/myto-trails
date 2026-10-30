/**
 * Whether this phone already has someone's data on it. The welcome flow is for a fresh install; a rider who updated the app has rides,
 * trips or documents and goes straight in. A fresh install has only the sample ride and the example to-dos, which do not count.
 */
export type KnownData = {
  rides: { sample?: boolean }[];
  trips: unknown[];
  /** A fresh install starts with a few example to-dos whose ids begin `seed-`; those are not the rider's. */
  todos: { id: string }[];
  profile: { licence?: unknown; vehicle?: unknown; contacts: unknown[] };
};

export const isReturningRider = (d: KnownData): boolean =>
  d.rides.some((r) => !r.sample) || d.trips.length > 0 || d.todos.some((t) => !t.id.startsWith('seed-')) || !!d.profile.licence || !!d.profile.vehicle || d.profile.contacts.length > 0;
