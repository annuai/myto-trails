import { useEffect, useRef, useState } from 'react';
import { needsReroute } from '@/lib/destinationRoute';
import type { LatLng } from '@/lib/geo';
import { roadRoute } from '@/lib/roadRoute';
import { planRoute } from '@/lib/routePlan';

/** `straight` is true when the road service could not be reached and the line and figures are only a straight-line estimate. */
export type DestinationRoute = { line: LatLng[]; km: number; etaMin: number; straight: boolean };

/**
 * The road from the rider to the group's destination, for the map and the "km to go" line. It is fetched when the destination
 * is set and again after the rider has moved a few hundred metres. With no connection it falls back to a straight line.
 */
export function useDestinationRoute(from: LatLng | undefined, to: LatLng | null | undefined): DestinationRoute | undefined {
  const [route, setRoute] = useState<DestinationRoute>();
  const asked = useRef<{ from: LatLng; to: LatLng } | undefined>(undefined);
  const ctl = useRef<AbortController | undefined>(undefined);
  const fromLat = from?.lat, fromLng = from?.lng;
  const toLat = to?.lat, toLng = to?.lng;

  useEffect(() => {
    if (fromLat === undefined || fromLng === undefined || toLat === undefined || toLng === undefined) {
      asked.current = undefined; ctl.current?.abort();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the destination was removed: the old line has to go
      setRoute(undefined);
      return;
    }
    const start = { lat: fromLat, lng: fromLng }, end = { lat: toLat, lng: toLng };
    if (!needsReroute(asked.current, start, end)) return;
    asked.current = { from: start, to: end };
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    roadRoute([start, end], c.signal)
      .then((r) => setRoute({ line: r.points, km: r.distanceKm, etaMin: r.etaMin, straight: false }))
      .catch((e: Error) => {
        if (e.name === 'AbortError') return;
        asked.current = undefined; // try again at the next position
        const p = planRoute([start, end]);
        setRoute({ line: p.points, km: p.distanceKm, etaMin: p.etaMin, straight: true });
      });
  }, [fromLat, fromLng, toLat, toLng]);

  useEffect(() => () => ctl.current?.abort(), []);
  return route;
}
