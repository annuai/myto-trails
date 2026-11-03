import 'maplibre-gl/dist/maplibre-gl.css';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { LocateFixed, Maximize2, Minimize2, Users } from 'lucide-react-native';
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import type { LatLng } from '@/lib/geo';
import { fixed, size, space } from '@/theme/tokens';
import { clusterMarks } from '@/lib/riderClusters';
import { unwrapBearing } from '@/lib/rideCamera';
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
function OsmMapView({ height, line, track, trackBreaks, position, waypoints, riders, riderMarks, destination, guide, regroup, onTap, follow, focus, heading, glideMs, covered, onPicker, pointer, dark, onFullscreen, fullscreen, radius = 0, interactive = true }: OsmMapProps) {
  const box = useRef<HTMLDivElement>(null);
  const coverTop = covered?.top ?? 0, coverBottom = covered?.bottom ?? 0, coverLeft = covered?.left ?? 0;
  const start = useMapStart();
  const tap = useRef(onTap);
  useEffect(() => { tap.current = onTap; });
  const map = useRef<MlMap | null>(null);
  /** The same map as `map`, as state: the pins are placed on the screen from it while drawing, and a ref cannot be read then. */
  const [mapView, setMapView] = useState<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  /** How big the map is, so the arrow can stand at the middle of the part not covered. */
  const [viewSize, setViewSize] = useState({ w: 0, h: 0 });
  // The map's credit sits above whatever covers its bottom edge.
  useEffect(() => { box.current?.querySelectorAll<HTMLElement>('.maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right').forEach((el) => { el.style.bottom = `${coverBottom}px`; }); }, [coverBottom, ready]);
  // The credit is an info button that opens when tapped, not a strip of text lying over the map.
  useEffect(() => { if (!ready) return; const t = setTimeout(() => { const a = box.current?.querySelector('.maplibregl-ctrl-attrib'); a?.classList.remove('maplibregl-compact-show'); a?.removeAttribute('open'); }, 0); return () => clearTimeout(t); }, [ready]);
  const [problem, setProblem] = useState<string>();
  const fitted = useRef(false);
  /** The camera follows the rider until the map is moved by hand; it then stays where it was left, and the live dots keep moving on it. */
  const [following, setFollowing] = useState(true);
  const followingRef = useRef(true);
  const [view, setView] = useState({ zoom: 15, tick: 0, bearing: 0 });
  // The arrow replaces the dot as soon as the way the rider is facing is known, followed or not.
  const arrow = !!pointer && heading !== undefined && !!position;
  const [openId, setOpenId] = useState<string>();
  const clusters = useMemo(() => clusterMarks(riderMarks ?? [], view.zoom), [riderMarks, view.zoom]);
  const open = clusters.find((c) => c.id === openId && c.marks.length > 1);
  const picking = !!open;
  useEffect(() => { onPicker?.(picking); }, [picking]); // eslint-disable-line react-hooks/exhaustive-deps

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
        setMapView(m);
        // The map handles its own touches. Keeping them from reaching React Native Web's responder system stops its
        // "Cannot find single active touch" warning when two fingers pinch or pan the map.
        for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const) box.current.addEventListener(type, (e) => e.stopPropagation(), { passive: true });
        if (interactive) m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-left');
        for (const type of ['dragstart', 'zoomstart', 'rotatestart', 'pitchstart'] as const) m.on(type, (e) => { if (follow && 'originalEvent' in e && e.originalEvent) { followingRef.current = false; setFollowing(false); } });
        m.on('move', () => setView({ zoom: m.getZoom(), tick: Date.now(), bearing: m.getBearing() }));
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
    return () => { cancelled = true; map.current?.remove(); map.current = null; setMapView(null); };
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
    (m.getSource('pos') as GeoJSONSource).setData(pointsFeature(position && !arrow ? [position] : []));
    (m.getSource('riders') as GeoJSONSource).setData(pointsFeature(riders));
    (m.getSource('regroup') as GeoJSONSource).setData(pointsFeature(regroup ? [regroup] : []));
    if (m.getLayer('osm')) m.setPaintProperty('osm', 'raster-brightness-max', dark ? 0.6 : 1);
    if (follow && position) { if (followingRef.current) m.easeTo({ center: [position.lng, position.lat], zoom: Math.max(m.getZoom(), 15), bearing: heading === undefined ? m.getBearing() : unwrapBearing(m.getBearing(), heading), padding: { top: coverTop, right: 0, bottom: coverBottom, left: coverLeft }, duration: glideMs ?? 500, easing: (t) => t }); return; }
    const all = [...coords(line), ...coords(track)];
    // While a route is being built by tapping, the camera stays where the rider put it.
    if (!all.length || tap.current || fitted.current && follow) return;
    import('maplibre-gl').then((ml) => {
      const b = new ml.LngLatBounds(all[0]!, all[0]!);
      all.forEach((c) => b.extend(c));
      m.fitBounds(b, { padding: space[8], maxZoom: 15, animate: fitted.current });
      fitted.current = true;
    });
  }, [ready, line, track, trackBreaks, position, waypoints, riders, riderMarks, guide, regroup, follow, heading, glideMs, arrow, coverTop, coverBottom, coverLeft, dark]);

  const recenter = () => {
    followingRef.current = true; setFollowing(true);
    if (position) map.current?.easeTo({ center: [position.lng, position.lat], zoom: 15, bearing: heading ?? 0, padding: { top: coverTop, right: 0, bottom: coverBottom, left: coverLeft }, duration: 600 });
  };
  /** The whole group in view: everyone with a position, and this phone. The camera stops following until the rider taps to centre again. */
  const showGroup = () => {
    const all = [...(riderMarks ?? []), ...(position ? [position] : [])];
    if (all.length < 2) return;
    followingRef.current = false; setFollowing(false);
    void import('maplibre-gl').then((ml) => {
      const b = new ml.LngLatBounds([all[0]!.lng, all[0]!.lat], [all[0]!.lng, all[0]!.lat]);
      all.forEach((p) => b.extend([p.lng, p.lat]));
      map.current?.fitBounds(b, { padding: space[8], maxZoom: 16, duration: 600 });
    });
  };
  /** Where a spot is on the screen now, or nothing before the map has loaded. */
  const screen = (p: { lat: number; lng: number }) => (ready ? mapView?.project([p.lng, p.lat]) : undefined);
  const dest = destination ? screen(destination) : undefined;
  // While the map follows, the arrow stands still at the middle of the clear part and the road moves under it; once the rider pans away it is a pin on the map.
  const arrowFixed = arrow && follow && following;
  const me = arrow && !arrowFixed && position ? screen(position) : undefined;

  return (
    <View onLayout={(e) => setViewSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={{ height: height === 'fill' ? undefined : height, flex: height === 'fill' ? 1 : undefined, borderRadius: radius, overflow: 'hidden', backgroundColor: dark ? fixed.mapNight : fixed.mapDay }}>
      <div ref={box} style={{ width: '100%', height: '100%' }} />
      {arrowFixed && viewSize.w > 0 ? <View pointerEvents="none" style={{ position: 'absolute', left: coverLeft + (viewSize.w - coverLeft) / 2 - size.pin / 2, top: coverTop + (viewSize.h - coverTop - coverBottom) / 2 - size.pin / 2 }}><HeadingPointer /></View> : null}
      {me ? <View pointerEvents="none" style={{ position: 'absolute', left: me.x - size.pin / 2, top: me.y - size.pin / 2 }}><HeadingPointer rotation={heading! - view.bearing} /></View> : null}
      {dest ? <View pointerEvents="none" style={{ position: 'absolute', left: dest.x - size.riderLabel / 2, top: dest.y - size.pin - size.chip, width: size.riderLabel, height: size.pin + size.chip, justifyContent: 'flex-end' }}><DestinationPin name={destination?.name} /></View> : null}
      {clusters.map((c) => {
        const at = screen(c);
        if (!at) return null;
        return c.marks.length > 1
          ? <View key={c.id} style={{ position: 'absolute', left: at.x - size.riderLabel / 2, top: at.y - size.chip / 2, width: size.riderLabel, alignItems: 'center' }}><Pressable accessibilityRole="button" accessibilityLabel={`${c.marks.length} riders here`} onPress={() => setOpenId(c.id)}><ClusterPin cluster={c} /></Pressable></View>
          : <View key={c.id} pointerEvents="none" style={{ position: 'absolute', left: at.x - size.riderDot / 2, top: at.y - size.chip / 2, height: size.chip, justifyContent: 'center' }}><RiderPin mark={c.marks[0]!} /></View>;
      })}
      {onFullscreen ? <View style={{ position: 'absolute', top: space[3], right: space[3] }}><IconButton size={size.compact} icon={fullscreen ? Minimize2 : Maximize2} label={fullscreen ? 'Shrink the map' : 'Full-screen map'} onPress={onFullscreen} /></View> : null}
      {follow && position ? (
        <View style={{ position: 'absolute', right: space[3], bottom: space[3] + size.chip + coverBottom, gap: space[2] }}>
          {(riderMarks?.length ?? 0) > 0 ? <IconButton size={size.compact} icon={Users} label="Show the whole group" onPress={showGroup} /> : null}
          {!following ? <IconButton size={size.compact} icon={LocateFixed} label="Centre the map on me" onPress={recenter} /> : null}
        </View>
      ) : null}
      {open ? <ClusterList cluster={open} onClose={() => setOpenId(undefined)} /> : null}
      {problem && !ready ? <View style={{ position: 'absolute', left: space[3], right: space[3], bottom: space[3] }}><Text variant="caption" tone="muted">{problem}</Text></View> : null}
    </View>
  );
}

/** Memoised: the live page redraws every second for its clock, and the map must not redraw with it. */
export const OsmMap = memo(OsmMapView);
