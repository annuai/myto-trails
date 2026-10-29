// Phone version (Android and iOS) on MapLibre Native. NOT yet run on a device: it needs a development build
// (not Expo Go) and is covered by the S0 spike. The web version, OsmMap.web.tsx, is the one tested so far.
import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map, type CameraRef } from '@maplibre/maplibre-react-native';
import type { LatLng } from '@/lib/geo';
import { fixed } from '@/theme/tokens';
import { mapStyleUrl, ROUTE_COLOR, TRACK_COLOR } from './style';
import { trackFeature } from './geojson';
import type { OsmMapProps } from './types';

const line = (pts: LatLng[] = []) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: pts.map((p) => [p.lng, p.lat]) } });
const points = (pts: LatLng[] = []) => ({ type: 'FeatureCollection' as const, features: pts.map((p) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] } })) });
const round = { 'line-cap': 'round', 'line-join': 'round' } as const;

export function OsmMap({ height, line: route, track, trackBreaks, position, waypoints, riders, regroup, onTap, follow, focus, dark, radius = 0, interactive = true }: OsmMapProps) {
  const camera = useRef<CameraRef>(null);
  useEffect(() => { if (focus) camera.current?.flyTo({ center: [focus.lng, focus.lat], zoom: 12 }); }, [focus]);
  const bounds = useMemo(() => {
    const all = [...(route ?? []), ...(track ?? [])];
    if (!all.length) return undefined;
    const lngs = all.map((p) => p.lng), lats = all.map((p) => p.lat);
    return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)] as [number, number, number, number];
  }, [route, track]);
  return (
    <View style={{ height, borderRadius: radius, overflow: 'hidden' }}>
      <Map mapStyle={mapStyleUrl(dark)} attribution style={{ flex: 1 }} dragPan={interactive} touchZoom={interactive} onPress={onTap ? (e) => onTap({ lat: e.nativeEvent.lngLat[1], lng: e.nativeEvent.lngLat[0] }) : undefined}>
        {follow && position ? <Camera ref={camera} center={[position.lng, position.lat]} zoom={15} /> : <Camera ref={camera} initialViewState={bounds ? { bounds, padding: { top: 32, bottom: 32, left: 32, right: 32 } } : { center: [78.9, 21], zoom: 3.5 }} />}
        <GeoJSONSource id="route" data={line(route)}><Layer id="route-line" type="line" layout={round} paint={{ 'line-color': ROUTE_COLOR, 'line-width': 4 }} /></GeoJSONSource>
        <GeoJSONSource id="track" data={trackFeature(track, trackBreaks)}><Layer id="track-line" type="line" layout={round} paint={{ 'line-color': TRACK_COLOR, 'line-width': 5 }} /></GeoJSONSource>
        <GeoJSONSource id="wpts" data={points(waypoints)}><Layer id="wpts-dot" type="circle" paint={{ 'circle-radius': 7, 'circle-color': fixed.white, 'circle-stroke-color': fixed.ink, 'circle-stroke-width': 3 }} /></GeoJSONSource>
        <GeoJSONSource id="riders" data={points(riders)}><Layer id="riders-dot" type="circle" paint={{ 'circle-radius': 8, 'circle-color': fixed.route, 'circle-stroke-color': fixed.white, 'circle-stroke-width': 3 }} /></GeoJSONSource>
        <GeoJSONSource id="regroup" data={points(regroup ? [regroup] : [])}><Layer id="regroup-ring" type="circle" paint={{ 'circle-radius': 11, 'circle-color': fixed.white, 'circle-stroke-color': fixed.track, 'circle-stroke-width': 5 }} /></GeoJSONSource>
        <GeoJSONSource id="pos" data={points(position ? [position] : [])}><Layer id="pos-dot" type="circle" paint={{ 'circle-radius': 9, 'circle-color': fixed.position, 'circle-stroke-color': fixed.white, 'circle-stroke-width': 3 }} /></GeoJSONSource>
      </Map>
    </View>
  );
}
