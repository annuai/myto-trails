import type { LatLng } from './geo';
import { elevationM, distanceKm, durationParts, speedKmh, type Quantity } from './units';
import { forSharing } from './privacy';
import { cardTokens } from './rideCard.tokens';
import { simplifyTo } from './routePlan';

export type CardFormat = 'story' | 'post' | 'square';
export const CARD_SIZE: Record<CardFormat, { width: number; height: number }> = cardTokens.size;

export type CardStat = 'distance' | 'time' | 'topSpeed' | 'waypoints' | 'elevation';
export const DEFAULT_STATS: CardStat[] = ['distance', 'time', 'topSpeed'];
export const MAX_CARD_STATS = 4;
const ROUTE_POINTS = 200;

export type CardRide = { name: string; startedAt: number; distanceKm: number; durationSec: number; maxKmh: number; waypoints: number; points: LatLng[]; elevationGainM?: number };

export type CardModel = {
  format: CardFormat; width: number; height: number;
  title: string; date: string;
  stats: { key: CardStat; label: string; parts: Quantity[] }[];
  /** The route inside a 0..1 square, north up, ends trimmed. Null when it is hidden or too short to show. */
  route: { x: number; y: number }[] | null;
  /** The route's width over its height, so the drawing can be fitted without stretching it. */
  routeAspect: number;
  /** The same route as map positions, for drawing it over map tiles. */
  geoRoute: LatLng[] | null;
};

const LABEL: Record<CardStat, string> = { distance: 'Distance', time: 'Time', topSpeed: 'Top speed', waypoints: 'Waypoints', elevation: 'Climb' };

/** A route as 0..1 coordinates: equal scale on both axes (so it is not distorted), centred, north at the top. */
export function normaliseRoute(points: LatLng[]): { points: { x: number; y: number }[]; aspect: number } {
  if (points.length < 2) return { points: [], aspect: 1 };
  const k = Math.cos((points.reduce((n, p) => n + p.lat, 0) / points.length) * (Math.PI / 180));
  const xs = points.map((p) => p.lng * k), ys = points.map((p) => p.lat);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX, h = maxY - minY, side = Math.max(w, h) || 1;
  const offX = (side - w) / 2, offY = (side - h) / 2;
  return { points: points.map((_, i) => ({ x: (xs[i] - minX + offX) / side, y: 1 - (ys[i] - minY + offY) / side })), aspect: h === 0 ? side / 1e-9 : w / h };
}

const dateText = (t: number) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * What a ride card shows. At most four stats (three by default), values in the app's own units, and the route
 * trimmed at both ends exactly like a shared route, so a card never shows where the rider lives.
 */
export function buildRideCard(ride: CardRide, opts: { format?: CardFormat; stats?: CardStat[]; hideRoute?: boolean; /** Show the route without cutting off its start and end. The rider's choice, for a ride too short to trim. */ fullRoute?: boolean } = {}): CardModel {
  const format = opts.format ?? 'story';
  const chosen = (opts.stats?.length ? opts.stats : DEFAULT_STATS).filter((s, i, a) => a.indexOf(s) === i).slice(0, MAX_CARD_STATS);
  const parts = (s: CardStat): Quantity[] | null => {
    switch (s) {
      case 'distance': return [distanceKm(ride.distanceKm)];
      case 'time': return durationParts(ride.durationSec);
      case 'topSpeed': return [speedKmh(ride.maxKmh)];
      case 'waypoints': return [{ value: String(ride.waypoints), unit: ride.waypoints === 1 ? 'waypoint' : 'waypoints' }];
      case 'elevation': return ride.elevationGainM != null ? [elevationM(ride.elevationGainM)] : null;
    }
  };
  const stats = chosen.flatMap((key) => { const p = parts(key); return p ? [{ key, label: LABEL[key], parts: p }] : []; });
  const shown = opts.hideRoute ? [] : opts.fullRoute ? ride.points : forSharing(ride.points);
  const thin = shown.length >= 2 ? simplifyTo(shown, ROUTE_POINTS) : null;
  const route = thin ? normaliseRoute(thin) : null;
  return { format, ...CARD_SIZE[format], title: ride.name, date: dateText(ride.startedAt), stats, route: route?.points ?? null, routeAspect: route?.aspect ?? 1, geoRoute: thin };
}
