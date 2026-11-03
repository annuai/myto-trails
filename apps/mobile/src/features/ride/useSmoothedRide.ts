import { useEffect, useMemo, useRef, useState } from 'react';
import { nowMs } from '@/lib/clock';
import type { LatLng } from '@/lib/geo';
import { glideMs, lookAheadM, matchToRoad, smoothHeading } from '@/lib/rideCamera';
import { prepareTrail } from '@/lib/trailGuide';

export type SmoothedRide = {
  position?: LatLng;
  /** The heading the map is turned to: steady. */
  heading?: number;
  /** The heading the arrow shows: close to the truth, so it swings into a corner first and the map follows it. */
  arrow?: number;
  /** How long the camera should glide to this position. */
  glideMs: number;
};

/**
 * The rider's position and heading as the live map should show them: steadied, not raw. On a planned road the position is the nearest
 * point of it and the heading is the road's own; elsewhere the position is the fix and the heading is the direction of travel, smoothed.
 * It updates once per fix, and says how long the camera should take to glide to it (the time since the last fix).
 */
export function useSmoothedRide({ position, speedMps, course, line }: { position?: LatLng; speedMps: number; /** The direction of travel worked out from the track, when there is one. */ course?: number; /** The road the rider is following, if any. */ line?: LatLng[] }): SmoothedRide {
  const road = useMemo(() => (line && line.length > 1 ? prepareTrail(line) : undefined), [line]);
  const [out, setOut] = useState<SmoothedRide>({ glideMs: glideMs(undefined) });
  const heading = useRef<number | undefined>(undefined);
  const arrow = useRef<number | undefined>(undefined);
  const lastAt = useRef<number | undefined>(undefined);
  const snapped = useRef(false);
  const along = useRef<number | undefined>(undefined);
  const lat = position?.lat, lng = position?.lng;

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    const now = nowMs();
    const since = lastAt.current === undefined ? undefined : now - lastAt.current;
    lastAt.current = now;
    let at: LatLng = { lat, lng }, sample = course;
    const m = road ? matchToRoad(road, at, snapped.current, along.current, lookAheadM(speedMps)) : null;
    snapped.current = !!m; along.current = m?.alongM;
    if (m) { at = m.point; sample = m.heading; }
    const dt = (since ?? 1000) / 1000;
    heading.current = smoothHeading(heading.current, sample, speedMps, dt, !!m);
    // The arrow follows more tightly than the map: a road's direction right away, or the smoothed course elsewhere.
    arrow.current = m ? smoothHeading(arrow.current, sample, speedMps, dt, true) : heading.current;
    setOut({ position: at, heading: heading.current, arrow: arrow.current, glideMs: glideMs(since) });
  }, [lat, lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return out;
}
