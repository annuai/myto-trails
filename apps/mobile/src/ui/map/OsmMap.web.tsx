import 'maplibre-gl/dist/maplibre-gl.css';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { LocateFixed, Maximize2, Minimize2 } from 'lucide-react-native';
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import type { LatLng } from '@/lib/geo';
import { fixed, size, space } from '@/theme/tokens';
import { clusterMarks } from '@/lib/riderClusters';
import { IconButton } from '../IconButton';
import { Text } from '../Text';
import { ClusterList, ClusterPin, DestinationPin, HeadingPointer, RiderPin } from './RiderPins';
import { mapStyleUrl, ROUTE_COLOR, TRACK_COLOR } from './style';
import { trackFeature } from './geojson';
import { useMapStart } from './useMapStart';
import type { OsmMapProps } from './types';

const coords = (pts: LatLng[] = []) => pts.map((p) => [p.lng, p.lat] as [number, number]);
const lineFeature = (pts?: LatLng[]) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: coords(pts) } });
const pointsFeature = (pts: LatLng[] = []) => ({ type: 'FeatureCollection' as const, features: pts.map((p) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] } })) });

/** OpenStreetMap through MapLibre GL, the same stack as the website. Two-finger or Ctrl+scroll to move, so it never traps page scrolling. */
function OsmMapView({ height, line, track, trackBreaks, position, waypoints, riders, riderMarks, destination, guide, regroup, onTap, follow, focus, heading, pointer, dark, onFullscreen, fullscreen, radius = 0, interactive = true }: OsmMapProps) {
  const box = useRef<HTMLDivElement>(null);
  const start = useMapStart();
  const tap = useRef(onTap);
  useEffect(() => { tap.current = onTap; });
  const map = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState<string>();
  const fitted = useRef(false);
  /** The camera follows the rider until the map is moved by hand; it then stays where it was left, and the live dots keep moving on it. */
  const [following, setFollowing] = useState(true);
  const followingRef = useRef(true);
  const [view, setView] = useState({ zoom: 15, tick: 0 });
  const [openId, setOpenId] = useState<string>();
  const clusters = useMemo(() => clusterMarks(riderMarks ?? [], view.zoom), [riderMarks, view.zoom]);
  const open = clusters.find((c) => c.id === openId && c.marks.length > 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ml = await import('maplibre-gl');
        ml.setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs');
        if (cancelled || !box.current) return;
        const m = new ml.Map({
          container: box.current, style: mapStyleUrl(dark), ...(start.kind === 'bounds' ? { bounds: start.bounds, fitBoundsOptions: { padding: space[8] } } : { center: start.center, zoom: start.zoom }),
          attributionControl: interactive ? { compact: true } : false, cooperativeGestures: !follow, interactive,
        });
        map.current = m;
        // The map handles its own touches. Keeping them from reaching React Native Web's responder system stops its
        // "Cannot find single active touch" warning when two fingers pinch or pan the map.
        for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const) box.current.addEventListener(type, (e) => e.stopPropagation(), { passive: true });
        if (interactive) m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-left');
        for (const type of ['dragstart', 'zoomstart', 'rotatestart', 'pitchstart'] as const) m.on(type, (e) => { if (follow && 'originalEvent' in e && e.originalEvent) { followingRef.current = false; setFollowing(false); } });
        m.on('move', () => setView({ zoom: m.getZoom(), tick: Date.now() }));
        m.on('click', (e) => tap.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
        m.on('error', (e) => setProblem(e.error?.message?.slice(0, 120) ?? 'The map reported an error.'));
        m.on('load', () => {
          m.addSource('guide', { type: 'geojson', data: lineFeature() });
          m.addSource('line', { type: 'geojson', data: lineFeature() });
          m.addSource('track', { type: 'geojson', data: trackFeature() });
          m.addSource('wpts', { type: 'geojson', data: pointsFeature() });
          m.addSource('pos', { type: 'geojson', data: pointsFeature() });
          m.addSource('riders', { type: 'geojson', data: pointsFeature() });
          m.addSource('regroup', { type: 'geojson', data: pointsFeature() });
          const casing = { 'line-cap': 'round', 'line-join': 'round' } as const;
          m.addLayer({ id: 'guide-casing', type: 'line', source: 'guide', layout: casing, paint: { 'line-color': fixed.white, 'line-width': 9 } });
          m.addLayer({ id: 'guide', type: 'line', source: 'guide', layout: casing, paint: { 'line-color': fixed.position, 'line-width': 6 } });
          m.addLayer({ id: 'line-casing', type: 'line', source: 'line', layout: casing, paint: { 'line-color': fixed.white, 'line-width': 7 } });
          m.addLayer({ id: 'line', type: 'line', source: 'line', layout: casing, paint: { 'line-color': ROUTE_COLOR, 'line-width': 4 } });
          m.addLayer({ id: 'track-casing', type: 'line', source: 'track', layout: casing, paint: { 'line-color': fixed.white, 'line-width': 8 } });
          m.addLayer({ id: 'track', type: 'line', source: 'track', layout: casing, paint: { 'line-color': TRACK_COLOR, 'line-width': 5 } });
          m.addLayer({ id: 'wpts', type: 'circle', source: 'wpts', paint: { 'circle-radius': 7, 'circle-color': fixed.white, 'circle-stroke-color': fixed.ink, 'circle-stroke-width': 3 } });
          m.addLayer({ id: 'riders', type: 'circle', source: 'riders', paint: { 'circle-radius': 8, 'circle-color': fixed.route, 'circle-stroke-color': fixed.white, 'circle-stroke-width': 3 } });
          m.addLayer({ id: 'regroup', type: 'circle', source: 'regroup', paint: { 'circle-radius': 11, 'circle-color': fixed.white, 'circle-stroke-color': fixed.track, 'circle-stroke-width': 5 } });
          m.addLayer({ id: 'pos', type: 'circle', source: 'pos', paint: { 'circle-radius': 9, 'circle-color': fixed.position, 'circle-stroke-color': fixed.white, 'circle-stroke-width': 3 } });
          setReady(true);
        });
      } catch {
        if (!cancelled) setProblem('The map could not start in this browser.');
      }
    })();
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
  }, [follow, interactive, dark]);

  useEffect(() => {
    if (focus && ready) map.current?.flyTo({ center: [focus.lng, focus.lat], zoom: Math.max(map.current.getZoom(), 12) });
  }, [focus, ready]);

  // Push data in as it changes (the live track grows every few seconds).
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    (m.getSource('guide') as GeoJSONSource).setData(lineFeature(guide));
    (m.getSource('line') as GeoJSONSource).setData(lineFeature(line));
    (m.getSource('track') as GeoJSONSource).setData(trackFeature(track, trackBreaks));
    (m.getSource('wpts') as GeoJSONSource).setData(pointsFeature(waypoints));
    (m.getSource('pos') as GeoJSONSource).setData(pointsFeature(position && !riderMarks?.length ? [position] : []));
    (m.getSource('riders') as GeoJSONSource).setData(pointsFeature(riders));
    (m.getSource('regroup') as GeoJSONSource).setData(pointsFeature(regroup ? [regroup] : []));
    if (m.getLayer('osm')) m.setPaintProperty('osm', 'raster-brightness-max', dark ? 0.6 : 1);
    if (follow && position) { if (followingRef.current) m.easeTo({ center: [position.lng, position.lat], zoom: Math.max(m.getZoom(), 15), bearing: heading ?? m.getBearing(), duration: 500 }); return; }
    const all = [...coords(line), ...coords(track)];
    // While a route is being built by tapping, the camera stays where the rider put it.
    if (!all.length || tap.current || fitted.current && follow) return;
    import('maplibre-gl').then((ml) => {
      const b = new ml.LngLatBounds(all[0]!, all[0]!);
      all.forEach((c) => b.extend(c));
      m.fitBounds(b, { padding: space[8], maxZoom: 15, animate: fitted.current });
      fitted.current = true;
    });
  }, [ready, line, track, trackBreaks, position, waypoints, riders, riderMarks, guide, regroup, follow, heading, dark]);

  const recenter = () => {
    followingRef.current = true; setFollowing(true);
    if (position) map.current?.easeTo({ center: [position.lng, position.lat], zoom: 15, bearing: heading ?? map.current.getBearing(), duration: 600 });
  };
  /** Where a spot is on the screen now, or nothing before the map has loaded. */
  const screen = (p: { lat: number; lng: number }) => (ready ? map.current?.project([p.lng, p.lat]) : undefined);
  const dest = destination ? screen(destination) : undefined;
  const me = pointer && follow && following && heading !== undefined && position ? screen(position) : undefined;

  return (
    <View style={{ height: height === 'fill' ? undefined : height, flex: height === 'fill' ? 1 : undefined, borderRadius: radius, overflow: 'hidden', backgroundColor: dark ? fixed.mapNight : fixed.mapDay }}>
      <div ref={box} style={{ width: '100%', height: '100%' }} />
      {me ? <View pointerEvents="none" style={{ position: 'absolute', left: me.x - size.chip / 2, top: me.y - size.chip / 2 }}><HeadingPointer /></View> : null}
      {dest ? <View pointerEvents="none" style={{ position: 'absolute', left: dest.x - size.riderLabel / 2, top: dest.y - size.pin - size.chip, width: size.riderLabel, height: size.pin + size.chip, justifyContent: 'flex-end' }}><DestinationPin name={destination?.name} /></View> : null}
      {clusters.map((c) => {
        const at = screen(c);
        if (!at) return null;
        return c.marks.length > 1
          ? <View key={c.id} style={{ position: 'absolute', left: at.x - size.riderLabel / 2, top: at.y - size.chip / 2, width: size.riderLabel, alignItems: 'center' }}><Pressable accessibilityRole="button" accessibilityLabel={`${c.marks.length} riders here`} onPress={() => setOpenId(c.id)}><ClusterPin cluster={c} /></Pressable></View>
          : <View key={c.id} pointerEvents="none" style={{ position: 'absolute', left: at.x - size.riderDot / 2, top: at.y - size.chip / 2, height: size.chip, justifyContent: 'center' }}><RiderPin mark={c.marks[0]!} /></View>;
      })}
      {onFullscreen ? <View style={{ position: 'absolute', top: space[3], right: space[3] }}><IconButton size={size.compact} icon={fullscreen ? Minimize2 : Maximize2} label={fullscreen ? 'Shrink the map' : 'Full-screen map'} onPress={onFullscreen} /></View> : null}
      {follow && position && !following ? <View style={{ position: 'absolute', right: space[3], bottom: space[3] }}><IconButton size={size.compact} icon={LocateFixed} label="Centre the map on me" onPress={recenter} /></View> : null}
      {open ? <ClusterList cluster={open} onClose={() => setOpenId(undefined)} /> : null}
      {problem && !ready ? <View style={{ position: 'absolute', left: space[3], right: space[3], bottom: space[3] }}><Text variant="caption" tone="muted">{problem}</Text></View> : null}
    </View>
  );
}

/** Memoised: the live page redraws every second for its clock, and the map must not redraw with it. */
export const OsmMap = memo(OsmMapView);
