/**
 * Marks: small stamps for first times and running totals, earned only from facts the phone already holds. Never for speed, never for a
 * longer or riskier ride than the last: nothing here rewards riding harder, only riding, looking after the bike, and riding together.
 */
export type MarkId = 'first-ride' | 'km-100' | 'km-500' | 'km-1000' | 'km-5000' | 'first-night' | 'first-group' | 'first-service' | 'first-fix';

/** How a mark is drawn: a glyph, or the number it stands for. */
export type MarkGlyph = 'route' | 'moon' | 'riders' | 'dial' | 'nut' | { km: number };

export type MarkDef = { id: MarkId; title: string; /** What earns it, in one plain line. */ hint: string; glyph: MarkGlyph };

export const MARKS: readonly MarkDef[] = [
  { id: 'first-ride', title: 'First ride', hint: 'Record your first ride.', glyph: 'route' },
  { id: 'km-100', title: '100 km', hint: 'Ride 100 km in Myto.', glyph: { km: 100 } },
  { id: 'km-500', title: '500 km', hint: 'Ride 500 km in Myto.', glyph: { km: 500 } },
  { id: 'km-1000', title: '1,000 km', hint: 'Ride 1,000 km in Myto.', glyph: { km: 1000 } },
  { id: 'km-5000', title: '5,000 km', hint: 'Ride 5,000 km in Myto.', glyph: { km: 5000 } },
  { id: 'first-night', title: 'First night ride', hint: 'Ride a trip that runs past 8 pm.', glyph: 'moon' },
  { id: 'first-group', title: 'First group ride', hint: 'Finish a ride with a group.', glyph: 'riders' },
  { id: 'first-service', title: 'First service logged', hint: 'Mark a service item as done.', glyph: 'dial' },
  { id: 'first-fix', title: 'First fix', hint: 'Finish a Fix it guide.', glyph: 'nut' },
];

export const markDef = (id: string): MarkDef | undefined => MARKS.find((m) => m.id === id);

export type MarkRide = { sample?: boolean; distanceKm: number; startedAt: number; durationSec: number; pausedSec?: number; groupId?: string };
export type MarkInput = {
  rides: MarkRide[];
  /** Service to-dos the rider has marked done at least once. */
  servicesDone: number;
  /** Fix it guides finished. */
  fixesDone: number;
};

/** Local hour at which a ride counts as a night ride. */
const NIGHT_FROM_H = 20, NIGHT_TO_H = 5;
const hourOf = (t: number) => new Date(t).getHours();
const isNight = (r: MarkRide) => {
  const end = r.startedAt + (r.durationSec + (r.pausedSec ?? 0)) * 1000;
  const h = [hourOf(r.startedAt), hourOf(end)];
  return h.some((x) => x >= NIGHT_FROM_H || x < NIGHT_TO_H);
};

/** Every mark the rider has earned so far. The seeded sample ride never counts. */
export function earnedMarks(i: MarkInput): MarkId[] {
  const real = i.rides.filter((r) => !r.sample);
  const km = real.reduce((n, r) => n + r.distanceKm, 0);
  const out: MarkId[] = [];
  if (real.length) out.push('first-ride');
  if (km >= 100) out.push('km-100');
  if (km >= 500) out.push('km-500');
  if (km >= 1000) out.push('km-1000');
  if (km >= 5000) out.push('km-5000');
  if (real.some(isNight)) out.push('first-night');
  if (real.some((r) => r.groupId)) out.push('first-group');
  if (i.servicesDone > 0) out.push('first-service');
  if (i.fixesDone > 0) out.push('first-fix');
  return out;
}

/** The marks in `now` that are not in `had`, in the order of the list. */
export const newMarks = (had: readonly string[], now: readonly MarkId[]): MarkId[] => MARKS.map((m) => m.id).filter((id) => now.includes(id) && !had.includes(id));
