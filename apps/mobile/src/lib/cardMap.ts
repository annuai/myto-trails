import type { LatLng } from './geo';

export const TILE = 256;
/** OpenStreetMap's tile server allows light use with attribution: a handful of tiles for one picture the rider asked for. */
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const ATTRIBUTION = '© OpenStreetMap contributors';
const MIN_ZOOM = 2, MAX_ZOOM = 16, FILL = 0.78;

export type MapTile = { url: string; /** Where the tile sits in the map box, in pixels. */ left: number; top: number };
export type CardMapLayout = { zoom: number; tiles: MapTile[]; /** The route in pixels of the map box. */ points: { x: number; y: number }[] };

const worldX = (lng: number, z: number) => ((lng + 180) / 360) * TILE * 2 ** z;
const worldY = (lat: number, z: number) => {
  const s = Math.sin((Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE * 2 ** z;
};

/**
 * Where the map tiles and the route go in a box of `width` x `height` pixels: the zoom at which the route fills most of the box,
 * the route centred, and the tiles that cover the box. Null when there is no route to show.
 */
export function layoutCardMap(route: LatLng[], box: { width: number; height: number }, template: string = TILE_URL): CardMapLayout | null {
  if (route.length < 2) return null;
  const lngs = route.map((p) => p.lng), lats = route.map((p) => p.lat);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs), minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const dx = worldX(maxLng, 0) - worldX(minLng, 0), dy = worldY(minLat, 0) - worldY(maxLat, 0);
  const fit = Math.min(dx > 0 ? (box.width * FILL) / dx : Infinity, dy > 0 ? (box.height * FILL) / dy : Infinity);
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number.isFinite(fit) ? Math.floor(Math.log2(fit)) : MAX_ZOOM));
  const cx = (worldX(minLng, zoom) + worldX(maxLng, zoom)) / 2, cy = (worldY(minLat, zoom) + worldY(maxLat, zoom)) / 2;
  const left = cx - box.width / 2, top = cy - box.height / 2;
  const n = 2 ** zoom;
  const tiles: MapTile[] = [];
  for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + box.height) / TILE); ty++) {
    if (ty < 0 || ty >= n) continue;
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + box.width) / TILE); tx++) {
      const wrapped = ((tx % n) + n) % n;
      tiles.push({ url: template.replace('{z}', String(zoom)).replace('{x}', String(wrapped)).replace('{y}', String(ty)), left: tx * TILE - left, top: ty * TILE - top });
    }
  }
  return { zoom, tiles, points: route.map((p) => ({ x: worldX(p.lng, zoom) - left, y: worldY(p.lat, zoom) - top })) };
}

/** The rectangle on the card where the map goes, in card pixels. The card's padding is the same on every side. */
export const CARD_PAD = 88;
export const mapBoxOf = (card: { width: number; height: number }) => ({ x: CARD_PAD, y: card.height * 0.2, width: card.width - CARD_PAD * 2, height: Math.min(card.width - CARD_PAD * 2, card.height * 0.46) });
