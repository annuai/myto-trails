import { sunTimes } from '@moto-trails/domain';
import { dayDate } from '../tripPlan';
import { planLadder, type AlarmStep, type GoalChoice, type RideContext } from './ladder';

/** Alarms are planned this far ahead; the rest come in at a later sync (iOS keeps few pending alerts). */
export const HORIZON_MS = 8 * 86_400_000;

/** What the rider chose for one trip (every day of it) or one club ride. */
export type AlarmSetting = {
  /** `trip:<id>` or `event:<id>`. */
  key: string;
  kind: 'trip' | 'event';
  refId: string;
  leadMin: number;
  goal: GoalChoice;
  /** A club ride's name and start, kept from when the alarm was set (the event list is not always on the phone). */
  title?: string;
  startsAt?: number;
};

/** One day of the forecast as the alarm reads it. */
export type AlarmDay = { iso: string; rainPct: number; maxC: number; minC?: number; sunriseMs?: number; sunsetMs?: number };

type TripLike = { id: string; name: string; startDate?: string; startTime?: number; days?: unknown[]; startedAt?: number; endedAt?: number };

/**
 * Everything the alarm planner reads: the time, the alarm settings, the trips, open pack to-dos, the forecast and where the sun is worked
 * out.
 */
export type AlarmWorld = {
  now: number;
  settings: AlarmSetting[];
  trips: TripLike[];
  /** Open pack to-dos of a trip. */
  packLeft: (tripId: string) => number;
  forecast: AlarmDay[];
  /** Where the sun is worked out when the forecast has no times: home, or the last known position. */
  place?: { lat: number; lng: number };
  /** Alarm groups the rider already got up for. */
  woke: Record<string, number>;
  clock: (ms: number) => string;
};

const localIso = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const localAt = (iso: string, min: number) => new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), 0, min).getTime();

/** About midday at that longitude on that date, whatever zone the phone is set to. */
const solarNoon = (iso: string, lng: number) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), 12) - (lng / 15) * 3_600_000;

function withDay(base: Omit<RideContext, 'sun' | 'weather'>, iso: string, w: AlarmWorld): RideContext {
  const f = w.forecast.find((d) => d.iso === iso);
  const sun = f?.sunriseMs !== undefined && f.sunsetMs !== undefined ? { sunriseMs: f.sunriseMs, sunsetMs: f.sunsetMs } : w.place ? sunTimes(solarNoon(iso, w.place.lng), w.place.lat, w.place.lng) : undefined;
  return { ...base, ...(sun ? { sun } : {}), ...(f ? { weather: { rainPct: f.rainPct, maxC: f.maxC, ...(f.minC !== undefined ? { minC: f.minC } : {}) } } : {}) };
}

/** Each ride an alarm is set for, from now to the horizon, that the rider has not already got up for. */
export function rideContexts(w: AlarmWorld, all = false): { ctx: RideContext; setting: AlarmSetting; reminderIds: string[] }[] {
  const out: { ctx: RideContext; setting: AlarmSetting; reminderIds: string[] }[] = [];
  const soon = (t: number) => all || (t > w.now && t - w.now <= HORIZON_MS);
  const woke = (id: string) => !all && !!w.woke[id];
  for (const s of w.settings) {
    if (s.kind === 'trip') {
      const trip = w.trips.find((t) => t.id === s.refId);
      if (!trip?.startDate || trip.startTime === undefined || trip.endedAt) continue;
      const days = Math.max(1, trip.days?.length ?? 1);
      for (let d = 0; d < days; d++) {
        if (d === 0 && trip.startedAt) continue;
        const iso = dayDate(trip.startDate, d);
        const startsAt = localAt(iso, trip.startTime);
        const id = `${s.key}:${iso}`;
        if (!soon(startsAt) || woke(id)) continue;
        const title = days > 1 ? `Day ${d + 1}: ${trip.name}` : trip.name;
        // The trip's own "starts in 10 minutes" reminder would only repeat the alarm.
        out.push({ ctx: withDay({ id, title, startsAt, group: false, ...(d === 0 ? { packLeft: w.packLeft(trip.id) } : {}) }, iso, w), setting: s, reminderIds: [`trip:${trip.id}:${trip.startDate}:day${d}:pre`] });
      }
    } else if (s.startsAt !== undefined) {
      const iso = localIso(s.startsAt);
      const id = `${s.key}:${iso}`;
      if (!soon(s.startsAt) || woke(id)) continue;
      out.push({ ctx: withDay({ id, title: s.title ?? 'Club ride', startsAt: s.startsAt, group: true }, iso, w), setting: s, reminderIds: [] });
    }
  }
  return out;
}

/** Every ring of every alarm, soonest first, and the reminders they stand in for. */
export function planAlarms(w: AlarmWorld): { steps: AlarmStep[]; replaces: string[] } {
  const rides = rideContexts(w);
  const steps = rides.flatMap((r) => planLadder(r.ctx, { leadMin: r.setting.leadMin, goal: r.setting.goal, now: w.now, clock: w.clock })).sort((a, b) => a.fireAt - b.fireAt);
  return { steps, replaces: rides.flatMap((r) => r.reminderIds) };
}

/** The ride behind one alarm group, whenever it is and whether or not the rider is up (for the pre-ride screen). */
export const contextOf = (w: AlarmWorld, group: string) => rideContexts(w, true).find((r) => r.ctx.id === group);

/** The next start still ahead for an alarm (any day of a trip, or the club ride), however far off; undefined once all have passed. */
export function nextStartAt(w: Pick<AlarmWorld, 'now' | 'trips'>, s: Pick<AlarmSetting, 'kind' | 'refId' | 'startsAt'>): number | undefined {
  if (s.kind === 'event') return s.startsAt !== undefined && s.startsAt > w.now ? s.startsAt : undefined;
  const trip = w.trips.find((t) => t.id === s.refId);
  if (!trip?.startDate || trip.startTime === undefined || trip.endedAt) return undefined;
  for (let d = 0; d < Math.max(1, trip.days?.length ?? 1); d++) {
    if (d === 0 && trip.startedAt) continue;
    const at = localAt(dayDate(trip.startDate, d), trip.startTime);
    if (at > w.now) return at;
  }
  return undefined;
}
