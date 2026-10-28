import { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { LatLng } from '@/lib/geo';
import { media, type Tint } from '@/theme/tokens';
import { OsmMap } from './map/OsmMap';
import { RouteArt } from './RouteArt';

type Props = {
  points: LatLng[];
  waypoints?: LatLng[];
  height?: number;
  radius?: number;
  dark?: boolean;
  /** Tint of the drawn route shown while the map loads, and when a ride has too few points for one. */
  tint?: Tint | 'night';
};

/**
 * A recorded ride on OpenStreetMap, fitted to the route. It is a picture, not a map to push around: touches pass
 * through, so the page behind it still scrolls. The map mounts after the first paint, and a ride with fewer
 * than two points keeps the drawn route.
 */
export function RideMap({ points, waypoints, height = media.mapCard, radius = 0, dark, tint = 'sky' }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);
  const art = <RouteArt points={points} tint={dark ? 'night' : tint} height={height} radius={radius} />;
  if (points.length < 2) return art;
  return (
    <View pointerEvents="none" style={{ height }}>
      {mounted ? <OsmMap height={height} radius={radius} dark={dark} track={points} waypoints={waypoints} interactive={false} /> : art}
    </View>
  );
}
