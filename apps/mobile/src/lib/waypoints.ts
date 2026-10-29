import type { LatLng } from './geo';

/** One stop on a route being built. `name` is set when it came from a place search; a point dropped on the map has none. */
export type Waypoint = { id: string; point: LatLng; name?: string; detail?: string };

/** The list with the stop at `from` moved to `to`. Out-of-range moves leave it as it was. */
export function moveWaypoint<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  next.splice(to, 0, next.splice(from, 1)[0]!);
  return next;
}

/** "Bengaluru to Mysuru" when both ends are named places, otherwise nothing, so the rider's own name (or a plain default) is used. */
export function routeNameFor(list: Waypoint[]): string {
  const a = list[0]?.name, b = list[list.length - 1]?.name;
  return list.length >= 2 && a && b ? `${a} to ${b}` : '';
}
