import { useEffect, useRef, useState } from 'react';
import { nowMs } from '@/lib/clock';
import { haversine, type LatLng } from '@/lib/geo';
import { OFF_ROUTE_AFTER_MS, OFF_ROUTE_M } from '@/lib/routeFollow';
import { fetchDirections, navigateStep, type Directions } from '@/lib/turnByTurn';

const RETRY_MS = 15_000;
/** A place that has moved less than this keeps its road. */
const TARGET_MOVED_M = 100;

/**
 * The road from the rider to a place, with its turns: asked for once there is a position, and again from where the rider is when
 * they stay more than 100 m off it for 20 s. With no `to` nothing is asked and nothing is returned. `failed` is true while the road
 * service cannot be reached; the next position tries again.
 */
export function useDirections(here: LatLng | undefined, to: LatLng | undefined, opts: { /** False before the ride starts: a rider standing still is not off the road. */ reroute?: boolean } = {}): { directions?: Directions; failed: boolean } {
  const [directions, setDirections] = useState<Directions>();
  const [failed, setFailed] = useState(false);
  const asking = useRef(false);
  const triedAt = useRef(0);
  /** Where the road in hand leads. */
  const askedTo = useRef<LatLng | undefined>(undefined);
  const offSince = useRef<number | null>(null);
  const toLat = to?.lat, toLng = to?.lng;

  // A new place means a new road. A place that has only crept a little (a rider on the move) keeps the road it has until it is 100 m away.
  useEffect(() => {
    const was = askedTo.current;
    if (was && toLat !== undefined && toLng !== undefined && haversine(was, { lat: toLat, lng: toLng }) < TARGET_MOVED_M) return;
    askedTo.current = undefined;
    triedAt.current = 0; offSince.current = null;
    setDirections(undefined); setFailed(false);
  }, [toLat, toLng]);

  const hereLat = here?.lat, hereLng = here?.lng;
  useEffect(() => {
    if (hereLat === undefined || hereLng === undefined || toLat === undefined || toLng === undefined) return;
    const from = { lat: hereLat, lng: hereLng }, dest = { lat: toLat, lng: toLng };
    const ask = () => {
      // A service that cannot be reached is tried again every 15 s, not at every position.
      if (asking.current || nowMs() - triedAt.current < RETRY_MS) return;
      asking.current = true; triedAt.current = nowMs();
      fetchDirections(from, dest)
        .then((d) => { askedTo.current = dest; setDirections(d); setFailed(false); offSince.current = null; })
        .catch(() => setFailed(true))
        .finally(() => { asking.current = false; });
    };
    if (!directions) { ask(); return; }
    if (opts.reroute === false) return;
    const nav = navigateStep(directions, from);
    if (nav.arrived || nav.offM <= OFF_ROUTE_M) { offSince.current = null; return; }
    offSince.current ??= nowMs();
    if (nowMs() - offSince.current >= OFF_ROUTE_AFTER_MS) ask();
  }, [hereLat, hereLng, toLat, toLng]); // eslint-disable-line react-hooks/exhaustive-deps

  return { directions, failed };
}

