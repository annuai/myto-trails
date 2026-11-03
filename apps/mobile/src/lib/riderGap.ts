import { bearing, haversine, type LatLng } from './geo';
import { turnBetween } from './rideCamera';
import { nearestOnLine } from './routeFollow';
import type { TrailLine } from './trailGuide';

/** How far another rider is from you, and whether that is ahead of you or behind you. `side` is null when there is no way to say. */
export type Gap = { m: number; side: 'ahead' | 'behind' | 'beside' | null };

/** Closer than this along the road, two riders are side by side. */
const BESIDE_M = 10;
/** A rider further than this from the road is not on it, so the road says nothing about where they are. */
const ON_ROAD_M = 150;

/**
 * Where a rider is compared with you, now: not how far they are from the destination. On the road you are both riding, it is the distance along
 * it (a rider 300 m up the road is 300 m ahead however the road bends); off a road, it is the straight distance, ahead when they are in front
 * of the way you are heading. It is pure, so the screen calls it again with each new position and the answer stays live.
 */
export function riderGap(o: { me: LatLng; rider: LatLng; heading?: number; road?: TrailLine }): Gap {
  const straight = haversine(o.me, o.rider);
  if (o.road) {
    const a = nearestOnLine(o.road.line, o.me), b = nearestOnLine(o.road.line, o.rider);
    if (a && b && a.distM <= ON_ROAD_M && b.distM <= ON_ROAD_M) {
      const d = b.alongM - a.alongM;
      return { m: Math.abs(d), side: Math.abs(d) < BESIDE_M ? 'beside' : d > 0 ? 'ahead' : 'behind' };
    }
  }
  if (o.heading !== undefined && straight >= BESIDE_M) return { m: straight, side: Math.abs(turnBetween(o.heading, bearing(o.me, o.rider))) <= 90 ? 'ahead' : 'behind' };
  return { m: straight, side: straight < BESIDE_M ? 'beside' : null };
}

/** The words after the distance: "ahead of you", "behind you", "beside you", or "from you" when it cannot be said. */
export const GAP_WORDS: Record<NonNullable<Gap['side']> | 'none', string> = { ahead: 'ahead of you', behind: 'behind you', beside: 'beside you', none: 'from you' };
export const gapWords = (g: Gap): string => GAP_WORDS[g.side ?? 'none'];
