import type { Bbox } from './fuel';

/** OpenFreeMap allows an app to download an area for offline use up to 3,000 tiles (or 50 MB) at a time; stay under that. */
export const MAX_PACK_TILES = 2_800;
/** Vector tiles from OpenFreeMap go to zoom 14; the phone enlarges them beyond that. */
export const PACK_MIN_ZOOM = 6;
export const PACK_MAX_ZOOM = 14;

const tileX = (lng: number, z: number) => Math.floor(((lng + 180) / 360) * 2 ** z);
const tileY = (lat: number, z: number) => {
  const s = Math.sin((Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI) / 180);
  return Math.floor((0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 2 ** z);
};

/** How many tiles cover the box at one zoom. */
export const tilesAt = (box: Bbox, z: number): number => (tileX(box.east, z) - tileX(box.west, z) + 1) * (tileY(box.south, z) - tileY(box.north, z) + 1);

/**
 * The deepest zoom whose tiles, added to all the shallower ones, still fit the limit: a short trail gets street detail, a long route
 * only the overview. Null when even the overview is too big (a route across half the country: download it in sections).
 */
export function planPack(box: Bbox, maxTiles: number = MAX_PACK_TILES): { minZoom: number; maxZoom: number; tiles: number } | null {
  for (let maxZoom = PACK_MAX_ZOOM; maxZoom >= PACK_MIN_ZOOM; maxZoom--) {
    let tiles = 0;
    for (let z = PACK_MIN_ZOOM; z <= maxZoom; z++) tiles += tilesAt(box, z);
    if (tiles <= maxTiles) return { minZoom: PACK_MIN_ZOOM, maxZoom, tiles };
  }
  return null;
}
