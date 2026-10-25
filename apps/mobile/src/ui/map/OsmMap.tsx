// Phone version (Android and iOS) on MapLibre Native. NOT yet run on a device: it needs a development build
// (not Expo Go) and is covered by the S0 spike. The web version, OsmMap.web.tsx, is the one tested so far.
import { useMemo } from 'react';
import { View } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import type { LatLng } from '@/lib/geo';
import { MAP_STYLE_URL, OSM_STYLE, ROUTE_COLOR, TRACK_COLOR } from './style';
import type { OsmMapProps } from './types';

const line = (pts: LatLng[] = []) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: pts.map((p) => [p.lng, p.lat]) } });
const points = (pts: LatLng[] = []) => ({ type: 'FeatureCollection' as const, features: pts.map((p) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] } })) });
const round = { 'line-cap': 'round', 'line-join': 'round' } as const;

export function OsmMap({ height, line: route, track, position, waypoints, follow, radius = 0 }: OsmMapProps) {
  const bounds = useMemo(() => {
    const all = [...(route ?? []), ...(track ?? [])];
    if (!all.length) return undefined;
    const lngs = all.map((p) => p.lng), lats = all.map((p) => p.lat);
    return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)] as [number, number, number, number];
  }, [route, track]);
  return (
    <View style={{ height, borderRadius: radius, overflow: 'hidden' }}>
      <Map mapStyle={(MAP_STYLE_URL || OSM_STYLE) as never} attribution style={{ flex: 1 }}>
        {follow && position ? <Camera center={[position.lng, position.lat]} zoom={15} /> : <Camera initialViewState={bounds ? { bounds, padding: { top: 32, bottom: 32, left: 32, right: 32 } } : { center: [78.9, 21], zoom: 3.5 }} />}
        <GeoJSONSource id="route" data={line(route)}><Layer id="route-line" type="line" layout={round} paint={{ 'line-color': ROUTE_COLOR, 'line-width': 4 }} /></GeoJSONSource>
        <GeoJSONSource id="track" data={line(track)}><Layer id="track-line" type="line" layout={round} paint={{ 'line-color': TRACK_COLOR, 'line-width': 5 }} /></GeoJSONSource>
        <GeoJSONSource id="wpts" data={points(waypoints)}><Layer id="wpts-dot" type="circle" paint={{ 'circle-radius': 7, 'circle-color': '#fff', 'circle-stroke-color': '#1a1a1a', 'circle-stroke-width': 3 }} /></GeoJSONSource>
        <GeoJSONSource id="pos" data={points(position ? [position] : [])}><Layer id="pos-dot" type="circle" paint={{ 'circle-radius': 9, 'circle-color': '#1f6feb', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 }} /></GeoJSONSource>
      </Map>
    </View>
  );
}
