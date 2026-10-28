import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import type { LatLng } from '@/lib/geo';
import { fixed } from '@/theme/tokens';
import { Text } from '../Text';
import { INDIA_CENTER, MAP_STYLE_URL, OSM_STYLE, ROUTE_COLOR, TRACK_COLOR } from './style';
import type { OsmMapProps } from './types';

const coords = (pts: LatLng[] = []) => pts.map((p) => [p.lng, p.lat] as [number, number]);
const lineFeature = (pts?: LatLng[]) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: coords(pts) } });
const pointsFeature = (pts: LatLng[] = []) => ({ type: 'FeatureCollection' as const, features: pts.map((p) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] } })) });

/** OpenStreetMap through MapLibre GL, the same stack as the website. Two-finger or Ctrl+scroll to move, so it never traps page scrolling. */
export function OsmMap({ height, line, track, position, waypoints, follow, dark, radius = 0, interactive = true }: OsmMapProps) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState<string>();
  const fitted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ml = await import('maplibre-gl');
        ml.setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs');
        if (cancelled || !box.current) return;
        const m = new ml.Map({
          container: box.current, style: (MAP_STYLE_URL || OSM_STYLE) as never, center: INDIA_CENTER, zoom: 3.5,
          attributionControl: { compact: true }, cooperativeGestures: !follow, interactive,
        });
        map.current = m;
        // The map handles its own touches. Keeping them from reaching React Native Web's responder system stops its
        // "Cannot find single active touch" warning when two fingers pinch or pan the map.
        for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const) box.current.addEventListener(type, (e) => e.stopPropagation(), { passive: true });
        if (interactive) m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
        m.on('error', (e) => setProblem(e.error?.message?.slice(0, 120) ?? 'The map reported an error.'));
        m.on('load', () => {
          m.addSource('line', { type: 'geojson', data: lineFeature() });
          m.addSource('track', { type: 'geojson', data: lineFeature() });
          m.addSource('wpts', { type: 'geojson', data: pointsFeature() });
          m.addSource('pos', { type: 'geojson', data: pointsFeature() });
          const casing = { 'line-cap': 'round', 'line-join': 'round' } as const;
          m.addLayer({ id: 'line-casing', type: 'line', source: 'line', layout: casing, paint: { 'line-color': fixed.white, 'line-width': 7 } });
          m.addLayer({ id: 'line', type: 'line', source: 'line', layout: casing, paint: { 'line-color': ROUTE_COLOR, 'line-width': 4 } });
          m.addLayer({ id: 'track-casing', type: 'line', source: 'track', layout: casing, paint: { 'line-color': fixed.white, 'line-width': 8 } });
          m.addLayer({ id: 'track', type: 'line', source: 'track', layout: casing, paint: { 'line-color': TRACK_COLOR, 'line-width': 5 } });
          m.addLayer({ id: 'wpts', type: 'circle', source: 'wpts', paint: { 'circle-radius': 7, 'circle-color': fixed.white, 'circle-stroke-color': fixed.ink, 'circle-stroke-width': 3 } });
          m.addLayer({ id: 'pos', type: 'circle', source: 'pos', paint: { 'circle-radius': 9, 'circle-color': fixed.position, 'circle-stroke-color': fixed.white, 'circle-stroke-width': 3 } });
          setReady(true);
        });
      } catch {
        if (!cancelled) setProblem('The map could not start in this browser.');
      }
    })();
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
  }, [follow, interactive]);

  // Push data in as it changes (the live track grows every few seconds).
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    (m.getSource('line') as GeoJSONSource).setData(lineFeature(line));
    (m.getSource('track') as GeoJSONSource).setData(lineFeature(track));
    (m.getSource('wpts') as GeoJSONSource).setData(pointsFeature(waypoints));
    (m.getSource('pos') as GeoJSONSource).setData(pointsFeature(position ? [position] : []));
    if (m.getLayer('osm')) m.setPaintProperty('osm', 'raster-brightness-max', dark ? 0.6 : 1);
    if (follow && position) { m.easeTo({ center: [position.lng, position.lat], zoom: Math.max(m.getZoom(), 15), duration: 500 }); return; }
    const all = [...coords(line), ...coords(track)];
    if (!all.length || fitted.current && follow) return;
    import('maplibre-gl').then((ml) => {
      const b = new ml.LngLatBounds(all[0]!, all[0]!);
      all.forEach((c) => b.extend(c));
      m.fitBounds(b, { padding: 32, maxZoom: 15, animate: fitted.current });
      fitted.current = true;
    });
  }, [ready, line, track, position, waypoints, follow, dark]);

  return (
    <View style={{ height, borderRadius: radius, overflow: 'hidden', backgroundColor: dark ? fixed.mapNight : fixed.mapDay }}>
      <div ref={box} style={{ width: '100%', height: '100%' }} />
      {problem && !ready ? <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}><Text variant="caption" tone="muted">{problem}</Text></View> : null}
    </View>
  );
}
