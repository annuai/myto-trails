import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { closingAt, prepareClosing } from '@/lib/closing';
import type { LatLng } from '@/lib/geo';
import { buzz } from '@/lib/haptics';
import { media, motion, type Tint } from '@/theme/tokens';
import { OsmMap } from './map/OsmMap';
import { useProgress } from './motionHooks';
import { RouteArt } from './RouteArt';

type Props = {
  points: LatLng[];
  /** Where each GPS segment after the first starts, so no line is drawn across a gap. */
  breaks?: number[];
  waypoints?: LatLng[];
  height?: number;
  radius?: number;
  dark?: boolean;
  /** Tint of the drawn route shown while the map loads, and when a ride has too few points for one. */
  tint?: Tint | 'night';
  /**
   * Ink the route onto the map: the whole route shows as a pencil line, then the ride is drawn over it with a head that travels along,
   * and stops appear as it passes them. Plays when `play` is true, again each time `run` changes, and then rests on the finished route.
   */
  ink?: { play: boolean; run: number; onDone?: () => void };
};

/**
 * A recorded ride on OpenStreetMap, fitted to the route. It is a picture, not a map to push around: touches pass
 * through, so the page behind it still scrolls. The map mounts after the first paint, and a ride with fewer
 * than two points keeps the drawn route.
 */
export function RideMap({ points, breaks, waypoints, height = media.mapCard, radius = 0, dark, tint = 'sky', ink }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);
  const hasInk = !!ink;
  const prep = useMemo(() => (hasInk ? prepareClosing(points, breaks, waypoints) : undefined), [hasInk, points, breaks, waypoints]);
  const p = useProgress(!!ink?.play && points.length >= 2, motion.duration.trace, { delay: motion.traceDelay, run: ink?.run, ease: 'standard' });
  const inking = !!prep && !!ink?.play && points.length >= 2 && p < 1;
  const frame = useMemo(() => (prep && inking ? closingAt(prep, p) : undefined), [prep, inking, p]);
  // When the ink reaches the end: a soft confirm, once.
  const was = useRef(false);
  const onDone = useRef(ink?.onDone);
  useEffect(() => { onDone.current = ink?.onDone; });
  useEffect(() => {
    if (inking) was.current = true;
    else if (was.current) { was.current = false; buzz.confirm(); onDone.current?.(); }
  }, [inking]);
  const art = <RouteArt points={points} tint={dark ? 'night' : tint} height={height} radius={radius} />;
  if (points.length < 2) return art;
  return (
    <View pointerEvents="none" style={{ height }}>
      {mounted ? (
        <OsmMap
          height={height} radius={radius} dark={dark} interactive={false}
          track={frame ? frame.track : points} trackBreaks={frame ? frame.breaks : breaks}
          line={frame ? points : undefined} position={frame?.head}
          waypoints={frame ? frame.passed.map((i) => waypoints![i]!) : waypoints}
        />
      ) : art}
    </View>
  );
}
