import type { StyleSpecification } from "maplibre-gl";

export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";

/**
 * Development and low-traffic basemap: OpenStreetMap's public raster tiles. Their usage policy forbids heavy use,
 * so production should point NEXT_PUBLIC_MAP_STYLE_URL at a tile provider (or self-hosted tiles) instead.
 */
export const OSM_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19, attribution: OSM_ATTRIBUTION },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};
