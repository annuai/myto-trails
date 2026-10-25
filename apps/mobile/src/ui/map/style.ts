import { fixed } from '@/theme/tokens';

export const OSM_ATTRIBUTION = '© OpenStreetMap contributors';

// OpenStreetMap's public tile servers allow light use only (https://operations.osmfoundation.org/policies/tiles/):
// no bulk downloading, a real attribution, and a valid Referer or User-Agent. Fine for development and a small beta.
// For launch set EXPO_PUBLIC_MAP_STYLE_URL to a tile provider or our own tiles (docs/15 §6), like the website does.
export const MAP_STYLE_URL = process.env.EXPO_PUBLIC_MAP_STYLE_URL;

export const OSM_STYLE = {
  version: 8 as const,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: { osm: { type: 'raster' as const, tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19, attribution: OSM_ATTRIBUTION } },
  layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
};

export const INDIA_CENTER: [number, number] = [78.9, 21];
export const ROUTE_COLOR = fixed.route;
export const TRACK_COLOR = fixed.track;
