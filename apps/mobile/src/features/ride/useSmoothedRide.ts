import { useEffect, useMemo, useRef, useState } from 'react';
import { nowMs } from '@/lib/clock';
import type { LatLng } from '@/lib/geo';
import { glideMs, matchToRoad, smoothHeading } from '@/lib/rideCamera';
import { prepareTrail } from '@/lib/trailGuide';

export type SmoothedRide = { position?: LatLng; heading?: number; /** How long the camera should glide to this position. */ glideMs: number };

/**
 * The rider's position and heading as the live map should show them: steadied, not raw. On a planned road the position is the nearest
 * point of it and the heading is the road's own; elsewhere the position is the fix and the heading is the direction of travel, smoothed.
 * It updates once per fix, and says how long the camera should take to glide to it (the time since the last fix).
 */
export function useSmoothedRide({ position, speedMps, course, line }: { position?: LatLng; speedMps: number; /** The direction of travel worked out from the track, when there is one. */ course?: number; /** The road the rider is following, if any. */ line?: LatLng[] }): SmoothedRide {
  const road = useMemo(() => (line && line.length > 1 ? prepareTrail(line) : undefined), [line]);
  const [out, setOut] = useState<SmoothedRide>({ glideMs: glideMs(undefined) });
  const heading = useRef<number | undefined>(undefined);
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
    const m = road ? matchToRoad(road, at, snapped.current, along.current) : null;
    snapped.current = !!m; along.current = m?.alongM;
    if (m) { at = m.point; sample = m.heading; }
    heading.current = smoothHeading(heading.current, sample, speedMps, (since ?? 1000) / 1000);
    setOut({ position: at, heading: heading.current, glideMs: glideMs(since) });
  }, [lat, lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return out;
}
