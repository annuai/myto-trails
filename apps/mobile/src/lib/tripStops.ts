import { clockLabel } from './community';
import type { TripDay } from './tripPlan';

export type StopKind = 'fuel' | 'food' | 'stay' | 'view' | 'other';
export const STOP_KINDS: { kind: StopKind; label: string }[] = [
  { kind: 'fuel', label: 'Fuel' }, { kind: 'food', label: 'Food' }, { kind: 'stay', label: 'Stay' }, { kind: 'view', label: 'Viewpoint' }, { kind: 'other', label: 'Other' },
];

/** A place on a day of a trip. `etaMin` is the rider's own estimate of minutes into the day's ride, not a calculated time. */
export type TripStop = { id: string; name: string; kind: StopKind; etaMin?: number };

export const addStop = (stops: TripStop[] | undefined, stop: TripStop): TripStop[] => [...(stops ?? []), stop];
export const removeStop = (stops: TripStop[], id: string): TripStop[] => stops.filter((s) => s.id !== id);

/** One place up (-1) or down (1). At either end, or for an unknown stop, the list is returned as it was. */
export function moveStop(stops: TripStop[], id: string, dir: -1 | 1): TripStop[] {
  const i = stops.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= stops.length) return stops;
  const out = [...stops];
  [out[i], out[j]] = [out[j]!, out[i]!];
  return out;
}

/** The clock time a stop is expected at, from the day's start time (minutes after midnight). Nothing when there is no estimate. */
export const stopClock = (startTime: number, etaMin?: number): string | undefined => (etaMin === undefined ? undefined : clockLabel((startTime + etaMin) % 1440));

/** Days for a copy of a trip: new ids all round, same notes, routes and stops. */
export const copyDays = (days: TripDay[], newId: () => string): TripDay[] =>
  days.map((d) => ({ ...d, id: newId(), ...(d.stops ? { stops: d.stops.map((s) => ({ ...s, id: newId() })) } : {}) }));
