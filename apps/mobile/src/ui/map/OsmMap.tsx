// Phone version (Android and iOS) on MapLibre Native. NOT yet run on a device: it needs a development build
// (not Expo Go) and is covered by the S0 spike. The web version, OsmMap.web.tsx, is the one tested so far.
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { LocateFixed, Maximize2, Minimize2, Users } from 'lucide-react-native';
import { Camera, GeoJSONSource, Layer, Map, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import type { LatLng } from '@/lib/geo';
import { fixed, size, space } from '@/theme/tokens';
import { clusterMarks } from '@/lib/riderClusters';
import { norm, turnBetween, unwrapBearing } from '@/lib/rideCamera';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { IconButton } from '../IconButton';
import { Text } from '../Text';
import { ClusterList, ClusterPin, DestinationPin, HeadingPointer, RiderPin } from './RiderPins';
import { heatLineLayout, heatPaints } from './heat.tokens';
import { heatDotFeatures, heatLineFeatures } from '@/lib/heat';
import { mapStyleUrl, ROUTE_COLOR, TRACK_COLOR } from './style';
import { trackFeature } from './geojson';
import { useMapDark } from './useMapDark';
import { useMapStart } from './useMapStart';
import type { OsmMapProps } from './types';

const line = (pts: LatLng[] = []) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: pts.map((p) => [p.lng, p.lat]) } });
const points = (pts: LatLng[] = []) => ({ type: 'FeatureCollection' as const, features: pts.map((p) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] } })) });
const FIT_PADDING = { top: space[8], bottom: space[8], left: space[8], right: space[8] };
const round = { 'line-cap': 'round', 'line-join': 'round' } as const;

/** The zoom the live map follows at; the badge grouping uses the real zoom once the rider has pinched. */
const FOLLOW_ZOOM = 15;
const GUIDE_COLOR = fixed.position;
/** How long the camera takes to glide to the rider's next position (positions come about a second apart), to fly back to them, and to fit the whole group. */
const FOLLOW_EASE_MS = 900, RECENTER_MS = 800, GROUP_VIEW_MS = 900, ZOOM_EASE_MS = 120;
const MIN_FOLLOW_ZOOM = 11, MAX_FOLLOW_ZOOM = 19;
/** The zoom a map for choosing a spot opens at: a town and its streets. */
const PICK_ZOOM = 14;
/** The bearing is read at most this often while the camera moves. */
const BEARING_READ_MS = 100;
/** If the map stays this far from the way it was told to face for this long, the camera is set again outright (see the effect below). */
const OFF_DEG = 40, OFF_MS = 2000;

function OsmMapView({ height, line: route, heat, track, trackBreaks, position, waypoints, riders, riderMarks, destination, guide, regroup, onTap, follow, focus, heading, arrowHeading, glideMs, covered, onPicker, pickFrom, onCenter, debug, pointer, dark: darkProp, onFullscreen, fullscreen, radius = 0, interactive = true }: OsmMapProps) {
  const dark = useMapDark(darkProp);
  const camera = useRef<CameraRef>(null);
  const [zoom, setZoom] = useState(FOLLOW_ZOOM);
  /** How the map is turned now, so the arrow can point where the bike goes whatever the map is doing. */
  /** The map's real bearing as the phone reports it, live while the camera moves. Everything drawn against the map's rotation uses this, never the bearing that was asked for. */
  const [bearing, setBearing] = useState(0);
  const bearingAt = useRef(0);
  const readBearing = (b: number) => { const now = Date.now(); if (now - bearingAt.current >= BEARING_READ_MS) { bearingAt.current = now; setBearing(b); } };
  const offSince = useRef(0);
  const [healed, setHealed] = useState(0);
  /** How big the map is, so the arrow can stand at the middle of the part not covered. */
  const [box, setBox] = useState({ w: 0, h: 0 });
  /** The camera's bearing, kept continuous across north so it never spins the long way round. */
  const camBearing = useRef(0);
  /** The zoom the camera follows at. The rider changes it by pinching, and it is kept: zooming never lets go of their position. */
  const [followZoom, setFollowZoom] = useState(FOLLOW_ZOOM);
  const lastZoomSent = useRef(FOLLOW_ZOOM);
  /** The camera follows the rider until the map is moved by hand; it then stays where it was left, and the live dots keep moving on it. */
  const [following, setFollowing] = useState(true);
  const [openId, setOpenId] = useState<string>();
  // The map's data is rebuilt only when its input changes: handing the map a new object every second makes the phone re-send the whole track each time, which is slow and drains the battery on a long ride.
  const routeData = useMemo(() => line(route), [route]);
  const guideData = useMemo(() => line(guide), [guide]);
  const trackData = useMemo(() => trackFeature(track, trackBreaks), [track, trackBreaks]);
  const wptsData = useMemo(() => points(waypoints), [waypoints]);
  const heatLines = useMemo(() => heatLineFeatures(heat), [heat]);
  const heatDots = useMemo(() => heatDotFeatures(heat), [heat]);
  const heatPaint = useMemo(() => heatPaints(dark), [dark]);
  const ridersData = useMemo(() => points(riders), [riders]);
  const regroupData = useMemo(() => points(regroup ? [regroup] : []), [regroup]);
  // The arrow replaces the dot as soon as the way the rider is facing is known, followed or not.
  const shownHeading = arrowHeading ?? heading;
  const arrow = !!pointer && shownHeading !== undefined && !!position;
  // While the map follows, the arrow is turned by how far the way the rider faces is from the way the map really faces (measured, not assumed): in a corner the arrow is ahead of the map, and if the map has not turned yet the arrow still points the right way on it.
  const arrowTurn = shownHeading !== undefined ? turnBetween(bearing, shownHeading) : 0;
  // While the camera follows, the arrow stands still at the middle of the clear part of the map and the road moves under it; a pin on the map would jump at every fix.
  const arrowFixed = arrow && !!follow && following;
  const posData = useMemo(() => points(position && !arrow ? [position] : []), [position?.lat, position?.lng, arrow]); // eslint-disable-line react-hooks/exhaustive-deps
  const clusters = useMemo(() => clusterMarks(riderMarks ?? [], zoom), [riderMarks, zoom]);
  const open = clusters.find((c) => c.id === openId && c.marks.length > 1);
  const picking = !!open;
  useEffect(() => { onPicker?.(picking); }, [picking]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = useMapStart();
  useEffect(() => { if (focus) camera.current?.flyTo({ center: [focus.lng, focus.lat], zoom: 12 }); }, [focus]);
  const bounds = useMemo(() => {
    const all = [...(route ?? []), ...(track ?? []), ...(heat?.lines.length ? heat.lines.flatMap((l) => l.points) : heat?.dots ?? [])];
    if (!all.length) return undefined;
    const lngs = all.map((p) => p.lng), lats = all.map((p) => p.lat);
    return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)] as [number, number, number, number];
  }, [route, track, heat]);
  // The camera's first view can be set before the map has its size, which leaves it on the wrong spot with no line in sight. Fit again once the map is drawn, and whenever the route changes.
  const coverTop = covered?.top ?? 0, coverBottom = covered?.bottom ?? 0, coverLeft = covered?.left ?? 0;
  // What floats over the map is kept out of the view in one of two ways. On iPhone the map's own inset: its centre and the point it turns about are both the middle of what is left,
  // so the rider stays under the arrow as the map turns. (Per-move camera padding is worked out with the map's old rotation, so on a corner the rider slid off the arrow.)
  // On Android each camera move carries the padding.
  const insetMap = Platform.OS === 'ios';
  const inset = useMemo(() => (insetMap ? { top: coverTop, right: 0, bottom: coverBottom, left: coverLeft } : undefined), [insetMap, coverTop, coverBottom, coverLeft]);
  const padding = useMemo(() => (!insetMap && (coverTop || coverBottom || coverLeft) ? { top: coverTop, right: 0, bottom: coverBottom, left: coverLeft } : undefined), [insetMap, coverTop, coverBottom, coverLeft]),
  /** Where the credit and logo sit: above what covers the bottom, unless the map's inset already moved them. */
  ornamentBottom = (insetMap ? 0 : coverBottom) + space[2];
  // Following moves the camera with animated moves, never by changing its props: a prop change jumps. Each position glides to the next over about a second, and "centre on me" flies back from wherever the map was left.
  const flyNext = useRef(false);
  useEffect(() => {
    if (!follow || !following || !position) return;
    if (heading !== undefined) camBearing.current = unwrapBearing(camBearing.current, heading);
    // The phone's map ignores a negative bearing outright (MLNMapView: `if (camera.heading >= 0)`), so it is sent as 0 to 360. It still turns the short way round.
    const stop = { center: [position.lng, position.lat] as [number, number], zoom: followZoom, bearing: heading === undefined ? undefined : norm(camBearing.current), padding };
    const zoomed = lastZoomSent.current !== followZoom;
    lastZoomSent.current = followZoom;
    try {
      if (flyNext.current) { flyNext.current = false; camera.current?.flyTo({ ...stop, duration: RECENTER_MS }); }
      // A steady glide at a constant speed over the time between fixes: an eased move would speed up and slow down every second.
      else camera.current?.easeTo({ ...stop, duration: zoomed ? ZOOM_EASE_MS : glideMs ?? FOLLOW_EASE_MS, easing: 'linear' });
    } catch { /* the map is not drawn yet: the next position moves it */ }
  }, [follow, following, position?.lat, position?.lng, heading, padding, followZoom]); // eslint-disable-line react-hooks/exhaustive-deps
  // A closed loop on the camera: the moves above are asked for and not checked, and a move the phone drops would leave the map facing the wrong way for good. If the measured bearing stays far from the wanted one, the camera is set to it outright.
  useEffect(() => {
    if (!follow || !following || !position || heading === undefined) { offSince.current = 0; return; }
    if (Math.abs(turnBetween(bearing, heading)) < OFF_DEG) { offSince.current = 0; return; }
    const now = Date.now();
    if (!offSince.current) { offSince.current = now; return; }
    if (now - offSince.current < OFF_MS) return;
    offSince.current = 0; setHealed((n) => n + 1);
    camBearing.current = unwrapBearing(bearing, heading);
    try { camera.current?.jumpTo({ center: [position.lng, position.lat], zoom: followZoom, bearing: norm(camBearing.current), padding }); } catch { /* not drawn yet */ }
  }, [bearing, follow, following, position?.lat, position?.lng, heading, padding, followZoom]); // eslint-disable-line react-hooks/exhaustive-deps
  // While following, a pinch changes only the zoom, about the rider, so the map never slides away from them; the map's own pinch (about the fingers) is off.
  // Each pinch step changes the zoom by its own share (scaleChange), so nothing about where the gesture began has to be remembered.
  const pinch = useMemo(() => Gesture.Pinch().runOnJS(true).enabled(!!follow && following).onChange((e) => setFollowZoom((z) => Math.max(MIN_FOLLOW_ZOOM, Math.min(MAX_FOLLOW_ZOOM, z + Math.log2(e.scaleChange))))), [follow, following]);
  const recenter = () => { flyNext.current = true; setFollowing(true); };
  /** The whole group in view: everyone with a position, and this phone. The camera stops following until the rider taps to centre again. */
  const showGroup = () => {
    const all = [...(riderMarks ?? []), ...(position ? [position] : [])];
    if (all.length < 2) return;
    setFollowing(false);
    // Kept clear of what floats over the map, and turned back to north-up so the spread of the group reads at a glance.
    camera.current?.fitBounds([Math.min(...all.map((p) => p.lng)), Math.min(...all.map((p) => p.lat)), Math.max(...all.map((p) => p.lng)), Math.max(...all.map((p) => p.lat))], { padding: insetMap ? FIT_PADDING : { top: FIT_PADDING.top + coverTop, bottom: FIT_PADDING.bottom + coverBottom, left: FIT_PADDING.left + coverLeft, right: FIT_PADDING.right }, duration: GROUP_VIEW_MS });
  };
  const fit = () => { if (bounds && !follow) camera.current?.fitBounds(bounds, { padding: FIT_PADDING, duration: 0 }); };
  useEffect(fit, [bounds, follow]);
  return (
    <GestureDetector gesture={pinch}>
    <View onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={{ height: height === 'fill' ? undefined : height, flex: height === 'fill' ? 1 : undefined, borderRadius: radius, overflow: 'hidden' }}>
      <Map mapStyle={mapStyleUrl(dark)} attribution={interactive} logo={interactive} attributionPosition={{ bottom: ornamentBottom, right: space[2] }} logoPosition={{ bottom: ornamentBottom, left: (insetMap ? 0 : coverLeft) + space[2] }} contentInset={inset} onDidFinishLoadingMap={fit} onRegionWillChange={(e) => { if (e.nativeEvent.userInteraction && follow) setFollowing(false); }} onRegionIsChanging={(e) => readBearing(e.nativeEvent.bearing)} onRegionDidChange={(e) => { onCenter?.({ lng: e.nativeEvent.center[0], lat: e.nativeEvent.center[1] }); setZoom(e.nativeEvent.zoom); bearingAt.current = 0; readBearing(e.nativeEvent.bearing); if (e.nativeEvent.userInteraction && follow) setFollowing(false); }} compassPosition={{ top: size.compact + space[4], right: space[3] }} style={{ flex: 1 }} dragPan={interactive} touchZoom={interactive && !(follow && following)} doubleTapZoom={interactive && !(follow && following)} onPress={onTap ? (e) => onTap({ lat: e.nativeEvent.lngLat[1], lng: e.nativeEvent.lngLat[0] }) : undefined}>
        <Camera ref={camera} initialViewState={pickFrom ? { center: [pickFrom.lng, pickFrom.lat], zoom: PICK_ZOOM, bearing: 0, padding: undefined } : follow && position ? { center: [position.lng, position.lat], zoom: FOLLOW_ZOOM, bearing: heading ?? 0, padding } : bounds ? { bounds, padding: FIT_PADDING } : start.kind === 'bounds' ? { bounds: start.bounds, padding: FIT_PADDING } : { center: start.center, zoom: start.zoom }} />
        <GeoJSONSource id="heat-dots" data={heatDots}><Layer id="heat-glow" type="heatmap" paint={heatPaint.glow as never} /></GeoJSONSource>
        <GeoJSONSource id="heat-lines" data={heatLines}>
          <Layer id="heat-halo" type="line" layout={heatLineLayout as never} paint={heatPaint.halo as never} />
          <Layer id="heat-line" type="line" layout={heatLineLayout as never} paint={heatPaint.line as never} />
        </GeoJSONSource>
        <GeoJSONSource id="guide" data={guideData}><Layer id="guide-line" type="line" layout={round} paint={{ 'line-color': GUIDE_COLOR, 'line-width': 6 }} /></GeoJSONSource>
        <GeoJSONSource id="route" data={routeData}><Layer id="route-line" type="line" layout={round} paint={{ 'line-color': ROUTE_COLOR, 'line-width': 4 }} /></GeoJSONSource>
        <GeoJSONSource id="track" data={trackData}><Layer id="track-line" type="line" layout={round} paint={{ 'line-color': TRACK_COLOR, 'line-width': 5 }} /></GeoJSONSource>
        <GeoJSONSource id="wpts" data={wptsData}><Layer id="wpts-dot" type="circle" paint={{ 'circle-radius': 7, 'circle-color': fixed.white, 'circle-stroke-color': fixed.ink, 'circle-stroke-width': 3 }} /></GeoJSONSource>
        <GeoJSONSource id="riders" data={ridersData}><Layer id="riders-dot" type="circle" paint={{ 'circle-radius': 8, 'circle-color': fixed.route, 'circle-stroke-color': fixed.white, 'circle-stroke-width': 3 }} /></GeoJSONSource>
        <GeoJSONSource id="regroup" data={regroupData}><Layer id="regroup-ring" type="circle" paint={{ 'circle-radius': 11, 'circle-color': fixed.white, 'circle-stroke-color': fixed.track, 'circle-stroke-width': 5 }} /></GeoJSONSource>
        <GeoJSONSource id="pos" data={posData}><Layer id="pos-dot" type="circle" paint={{ 'circle-radius': 9, 'circle-color': fixed.position, 'circle-stroke-color': fixed.white, 'circle-stroke-width': 3 }} /></GeoJSONSource>
        {arrow && !arrowFixed && position ? <Marker id="heading" lngLat={[position.lng, position.lat]}><HeadingPointer rotation={shownHeading! - bearing} /></Marker> : null}
        {destination ? <Marker id="destination" lngLat={[destination.lng, destination.lat]} anchor="bottom"><DestinationPin name={destination.name} /></Marker> : null}
        {clusters.map((c) => c.marks.length > 1
          ? <Marker key={c.id} id={`riders-${c.id}`} lngLat={[c.lng, c.lat]} onPress={() => setOpenId(c.id)}><ClusterPin cluster={c} /></Marker>
          : <Marker key={c.id} id={`riders-${c.id}`} lngLat={[c.lng, c.lat]} anchor="left" offset={[-size.riderDot / 2, 0]}><RiderPin mark={c.marks[0]!} /></Marker>)}
      </Map>
      {arrowFixed && box.w > 0 ? <View pointerEvents="none" style={{ position: 'absolute', left: coverLeft + (box.w - coverLeft) / 2 - size.pin / 2, top: coverTop + (box.h - coverTop - coverBottom) / 2 - size.pin / 2 }}><HeadingPointer rotation={arrowTurn} /></View> : null}
      {debug ? <View pointerEvents="none" style={{ position: 'absolute', left: space[3], bottom: space[3] + coverBottom + size.chip, paddingHorizontal: space[2], paddingVertical: space.half, borderRadius: size.chip, backgroundColor: fixed.white }}><Text variant="caption" style={{ color: fixed.ink }}>{`hdg ${heading === undefined ? '-' : Math.round(heading)} · arrow ${arrowHeading === undefined ? '-' : Math.round(arrowHeading)} · map ${Math.round(((bearing % 360) + 360) % 360)} · ${following ? 'following' : 'free'} · z${followZoom.toFixed(1)} · fixed ${healed}× · ${insetMap ? 'inset' : 'padding'}`}</Text></View> : null}
      {onFullscreen ? <View style={{ position: 'absolute', top: space[3], right: space[3] }}><IconButton size={size.compact} icon={fullscreen ? Minimize2 : Maximize2} label={fullscreen ? 'Shrink the map' : 'Full-screen map'} onPress={onFullscreen} /></View> : null}
      {follow && position ? (
        <View style={{ position: 'absolute', right: space[3], bottom: space[3] + size.chip + coverBottom, gap: space[2] }}>
          {(riderMarks?.length ?? 0) > 0 ? <IconButton size={size.compact} icon={Users} label="Show the whole group" onPress={showGroup} /> : null}
          {!following ? <IconButton size={size.compact} icon={LocateFixed} label="Centre the map on me" onPress={recenter} /> : null}
        </View>
      ) : null}
      {open ? <ClusterList cluster={open} onClose={() => setOpenId(undefined)} /> : null}
    </View>
    </GestureDetector>
  );
}

/** Memoised: the live page redraws every second for its clock, and the map must not redraw with it. */
export const OsmMap = memo(OsmMapView);
