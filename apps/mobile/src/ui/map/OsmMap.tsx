// Phone version (Android and iOS) on MapLibre Native. NOT yet run on a device: it needs a development build
// (not Expo Go) and is covered by the S0 spike. The web version, OsmMap.web.tsx, is the one tested so far.
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { LocateFixed, Maximize2, Minimize2 } from 'lucide-react-native';
import { Camera, GeoJSONSource, Layer, Map, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import type { LatLng } from '@/lib/geo';
import { fixed, size, space } from '@/theme/tokens';
import { clusterMarks } from '@/lib/riderClusters';
import { IconButton } from '../IconButton';
import { ClusterList, ClusterPin, DestinationPin, RiderPin } from './RiderPins';
import { mapStyleUrl, ROUTE_COLOR, TRACK_COLOR } from './style';
import { trackFeature } from './geojson';
import { useMapStart } from './useMapStart';
import type { OsmMapProps } from './types';

const line = (pts: LatLng[] = []) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: pts.map((p) => [p.lng, p.lat]) } });
const points = (pts: LatLng[] = []) => ({ type: 'FeatureCollection' as const, features: pts.map((p) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] } })) });
const FIT_PADDING = { top: space[8], bottom: space[8], left: space[8], right: space[8] };
const round = { 'line-cap': 'round', 'line-join': 'round' } as const;

/** The zoom the live map follows at; the badge grouping uses the real zoom once the rider has pinched. */
const FOLLOW_ZOOM = 15;
const GUIDE_COLOR = fixed.position;

function OsmMapView({ height, line: route, track, trackBreaks, position, waypoints, riders, riderMarks, destination, guide, regroup, onTap, follow, focus, heading, dark, onFullscreen, fullscreen, radius = 0, interactive = true }: OsmMapProps) {
  const camera = useRef<CameraRef>(null);
  const [zoom, setZoom] = useState(FOLLOW_ZOOM);
  /** The camera follows the rider until the map is moved by hand; it then stays where it was left, and the live dots keep moving on it. */
  const [following, setFollowing] = useState(true);
  const [openId, setOpenId] = useState<string>();
  // The map's data is rebuilt only when its input changes: handing the map a new object every second makes the phone re-send the whole track each time, which is slow and drains the battery on a long ride.
  const routeData = useMemo(() => line(route), [route]);
  const guideData = useMemo(() => line(guide), [guide]);
  const trackData = useMemo(() => trackFeature(track, trackBreaks), [track, trackBreaks]);
  const wptsData = useMemo(() => points(waypoints), [waypoints]);
  const ridersData = useMemo(() => points(riders), [riders]);
  const regroupData = useMemo(() => points(regroup ? [regroup] : []), [regroup]);
  const showPos = !riderMarks?.length;
  const posData = useMemo(() => points(position && showPos ? [position] : []), [position?.lat, position?.lng, showPos]); // eslint-disable-line react-hooks/exhaustive-deps
  const clusters = useMemo(() => clusterMarks(riderMarks ?? [], zoom), [riderMarks, zoom]);
  const open = clusters.find((c) => c.id === openId && c.marks.length > 1);
  const start = useMapStart();
  useEffect(() => { if (focus) camera.current?.flyTo({ center: [focus.lng, focus.lat], zoom: 12 }); }, [focus]);
  const bounds = useMemo(() => {
    const all = [...(route ?? []), ...(track ?? [])];
    if (!all.length) return undefined;
    const lngs = all.map((p) => p.lng), lats = all.map((p) => p.lat);
    return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)] as [number, number, number, number];
  }, [route, track]);
  // The camera's first view can be set before the map has its size, which leaves it on the wrong spot with no line in sight. Fit again once the map is drawn, and whenever the route changes.
  const recenter = () => { setFollowing(true); if (position) camera.current?.flyTo({ center: [position.lng, position.lat], zoom: FOLLOW_ZOOM, bearing: heading, duration: 600 }); };
  const fit = () => { if (bounds && !follow) camera.current?.fitBounds(bounds, { padding: FIT_PADDING, duration: 0 }); };
  useEffect(fit, [bounds, follow]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ height: height === 'fill' ? undefined : height, flex: height === 'fill' ? 1 : undefined, borderRadius: radius, overflow: 'hidden' }}>
      <Map mapStyle={mapStyleUrl(dark)} attribution={interactive} logo={interactive} onDidFinishLoadingMap={fit} onRegionDidChange={(e) => { setZoom(e.nativeEvent.zoom); if (e.nativeEvent.userInteraction && follow) setFollowing(false); }} compassPosition={{ top: size.compact + space[4], right: space[3] }} style={{ flex: 1 }} dragPan={interactive} touchZoom={interactive} onPress={onTap ? (e) => onTap({ lat: e.nativeEvent.lngLat[1], lng: e.nativeEvent.lngLat[0] }) : undefined}>
        {follow && position && following ? <Camera ref={camera} center={[position.lng, position.lat]} zoom={FOLLOW_ZOOM} bearing={heading} /> : <Camera ref={camera} initialViewState={bounds ? { bounds, padding: FIT_PADDING } : start.kind === 'bounds' ? { bounds: start.bounds, padding: FIT_PADDING } : { center: start.center, zoom: start.zoom }} />}
        <GeoJSONSource id="guide" data={guideData}><Layer id="guide-line" type="line" layout={round} paint={{ 'line-color': GUIDE_COLOR, 'line-width': 6 }} /></GeoJSONSource>
        <GeoJSONSource id="route" data={routeData}><Layer id="route-line" type="line" layout={round} paint={{ 'line-color': ROUTE_COLOR, 'line-width': 4 }} /></GeoJSONSource>
        <GeoJSONSource id="track" data={trackData}><Layer id="track-line" type="line" layout={round} paint={{ 'line-color': TRACK_COLOR, 'line-width': 5 }} /></GeoJSONSource>
        <GeoJSONSource id="wpts" data={wptsData}><Layer id="wpts-dot" type="circle" paint={{ 'circle-radius': 7, 'circle-color': fixed.white, 'circle-stroke-color': fixed.ink, 'circle-stroke-width': 3 }} /></GeoJSONSource>
        <GeoJSONSource id="riders" data={ridersData}><Layer id="riders-dot" type="circle" paint={{ 'circle-radius': 8, 'circle-color': fixed.route, 'circle-stroke-color': fixed.white, 'circle-stroke-width': 3 }} /></GeoJSONSource>
        <GeoJSONSource id="regroup" data={regroupData}><Layer id="regroup-ring" type="circle" paint={{ 'circle-radius': 11, 'circle-color': fixed.white, 'circle-stroke-color': fixed.track, 'circle-stroke-width': 5 }} /></GeoJSONSource>
        <GeoJSONSource id="pos" data={posData}><Layer id="pos-dot" type="circle" paint={{ 'circle-radius': 9, 'circle-color': fixed.position, 'circle-stroke-color': fixed.white, 'circle-stroke-width': 3 }} /></GeoJSONSource>
        {destination ? <Marker id="destination" lngLat={[destination.lng, destination.lat]} anchor="bottom"><DestinationPin name={destination.name} /></Marker> : null}
        {clusters.map((c) => c.marks.length > 1
          ? <Marker key={c.id} id={`riders-${c.id}`} lngLat={[c.lng, c.lat]} onPress={() => setOpenId(c.id)}><ClusterPin cluster={c} /></Marker>
          : <Marker key={c.id} id={`riders-${c.id}`} lngLat={[c.lng, c.lat]} anchor="left" offset={[-size.riderDot / 2, 0]}><RiderPin mark={c.marks[0]!} /></Marker>)}
      </Map>
      {onFullscreen ? <View style={{ position: 'absolute', top: space[3], right: space[3] }}><IconButton size={size.compact} icon={fullscreen ? Minimize2 : Maximize2} label={fullscreen ? 'Shrink the map' : 'Full-screen map'} onPress={onFullscreen} /></View> : null}
      {follow && position && !following ? <View style={{ position: 'absolute', right: space[3], bottom: space[3] }}><IconButton size={size.compact} icon={LocateFixed} label="Centre the map on me" onPress={recenter} /></View> : null}
      {open ? <ClusterList cluster={open} onClose={() => setOpenId(undefined)} /> : null}
    </View>
  );
}

/** Memoised: the live page redraws every second for its clock, and the map must not redraw with it. */
export const OsmMap = memo(OsmMapView);
