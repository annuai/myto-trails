import type { GroupRegroup } from '@/api/groups';
import type { EventRole } from '@/api/types';
import type { LatLng } from './geo';
import type { GroupRiderView, GroupStatus } from './groupCore';
import { pointAt, prepareTrail, type TrailLine } from './trailGuide';

/**
 * A made-up group ride for testing the live map without a group. The group's id marks it, so the app never sends it to the server.
 * Everything here is pure: the road to ride, the speed and the time since the start go in; where each rider is and what they signalled
 * comes out. This phone is Annuai; Pranab, Jithin and Abha are played from a script.
 */
export const SIM_GROUP_ID = 'sim-group';
export const SIM_ME = 'sim-me';
export const SIM_ME_NAME = 'Annuai';
/** Speed along the built-in test loop: about 40 km/h. */
export const SIM_SPEED_MPS = 11;
/** Speed along a real road to a trail: about 72 km/h, so a long road is ridden in a reasonable time. */
export const SIM_ROAD_SPEED_MPS = 20;

const ORIGIN = { lat: 13.0, lng: 77.6 };
const M_PER_DEG_LAT = 111_320;
/** The corners of the built-in test loop in metres east and north of its start: about 6 km with lefts, rights and a long straight. It is used when there is no location or no network to ask for a real road. */
const CORNERS: readonly (readonly [number, number])[] = [[0, 0], [0, 700], [1000, 700], [1000, 1500], [2200, 1500], [2200, 600], [2200, -200], [1400, -200]];
const SPACING_M = 20;

const toLatLng = ([e, n]: readonly [number, number]): LatLng => ({ lat: ORIGIN.lat + n / M_PER_DEG_LAT, lng: ORIGIN.lng + e / (M_PER_DEG_LAT * Math.cos((ORIGIN.lat * Math.PI) / 180)) });

/** The test loop with a point every 20 m, so a rider's dot slides along it rather than jumping between corners. */
export const SIM_ROUTE: LatLng[] = CORNERS.slice(1).reduce<LatLng[]>((line, c, i) => {
  const a = CORNERS[i]!, steps = Math.max(1, Math.round(Math.hypot(c[0] - a[0], c[1] - a[1]) / SPACING_M));
  for (let k = line.length ? 1 : 0; k <= steps; k++) line.push(toLatLng([a[0] + ((c[0] - a[0]) * k) / steps, a[1] + ((c[1] - a[1]) * k) / steps]));
  return line;
}, []);
export const SIM_TRAIL: TrailLine = prepareTrail(SIM_ROUTE);

/** Where the group meets: the end of the road, named. */
export const simRegroup = (trail: TrailLine, note: string): GroupRegroup => ({ ...trail.line[trail.line.length - 1]!, note });

type Scripted = { id: string; name: string; role: string; /** The title the script gives them to begin with. */ title?: EventRole; /** Metres ahead (+) or behind (-) of the start. */ offsetM: number; /** Their speed as a share of the group's. */ pace: number; /** Seconds into the ride when the rider stands still, and for how long. */ stop?: { at: number; for: number }; signals?: { from: number; to: number; status: GroupStatus }[] };
const RIDERS: Scripted[] = [
  { id: 'sim-pranab', name: 'Pranab', role: 'leader', title: 'medic', offsetM: 450, pace: 1.05 },
  { id: 'sim-jithin', name: 'Jithin', role: 'member', title: 'sweep', offsetM: -250, pace: 0.92, signals: [{ from: 40, to: 90, status: 'wait_up' }, { from: 150, to: 180, status: 'help' }] },
  { id: 'sim-abha', name: 'Abha', role: 'member', offsetM: -100, pace: 1.03, stop: { at: 70, for: 50 }, signals: [{ from: 70, to: 120, status: 'fuel' }] },
];

/** Where along the road (metres from its start) a scripted rider is `s` seconds into the ride at the group's `speed`. They stop at the end of it. */
export function alongAt(r: Pick<Scripted, 'offsetM' | 'pace' | 'stop'>, s: number, trail: TrailLine = SIM_TRAIL, speed: number = SIM_SPEED_MPS): number {
  const stopped = r.stop ? Math.min(r.stop.for, Math.max(0, s - r.stop.at)) : 0;
  return Math.max(0, Math.min(trail.totalM, r.offsetM + speed * r.pace * (s - stopped)));
}

/** The simulated phone's own distance along the road `s` seconds into the ride, riding it start to end. */
export const simMeAlong = (s: number, trail: TrailLine = SIM_TRAIL, speed: number = SIM_SPEED_MPS): number => Math.min(trail.totalM, s * speed);
export const simMePoint = (s: number, trail: TrailLine = SIM_TRAIL, speed: number = SIM_SPEED_MPS): LatLng => pointAt(trail, simMeAlong(s, trail, speed));

const statusAt = (r: Scripted, s: number): GroupStatus => r.signals?.find((x) => s >= x.from && s < x.to)?.status ?? 'ok';

/** Everyone in the simulated group `s` seconds in, as the server would send them: this phone first at its own point, then the scripted riders. */
export function simRiders(s: number, now: number, me: { name: string; status: GroupStatus }, trail: TrailLine = SIM_TRAIL, speed: number = SIM_SPEED_MPS, titles: Record<string, EventRole | null> = {}): GroupRiderView[] {
  const at = new Date(now).toISOString();
  const mine = simMePoint(s, trail, speed);
  return [
    { id: SIM_ME, name: me.name, role: 'member', lat: mine.lat, lng: mine.lng, at, status: me.status },
    ...RIDERS.map((r): GroupRiderView => { const p = pointAt(trail, alongAt(r, s, trail, speed)); return { id: r.id, name: r.name, role: r.role, eventRole: titles[r.id] !== undefined ? titles[r.id] : r.title ?? null, lat: p.lat, lng: p.lng, at, status: statusAt(r, s) }; }),
  ];
}

/**
 * What a phone's GPS does that a test route does not: each fix is a few metres off in a random direction, and now and then one is missed.
 * `rand` gives numbers from 0 to 1 (a seeded one in tests). The error is at most `maxM` metres; `dropOdds` is the chance a fix is lost.
 */
export function noisyFix(p: LatLng, rand: () => number, maxM = 8, dropOdds = 0.15): LatLng | null {
  if (rand() < dropOdds) return null;
  const r = maxM * Math.sqrt(rand()), a = rand() * 2 * Math.PI;
  return { ...p, lat: p.lat + (r * Math.cos(a)) / M_PER_DEG_LAT, lng: p.lng + (r * Math.sin(a)) / (M_PER_DEG_LAT * Math.cos((p.lat * Math.PI) / 180)) };
}
