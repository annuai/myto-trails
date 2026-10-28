import { OfflineManager } from '@maplibre/maplibre-react-native';
import { MAP_STYLE_URL } from '@/ui/map/style';
import type { LatLng } from './geo';
import { bboxOf } from './fuel';

/**
 * Map tiles for one trail, saved on the phone so the map works with no signal. OpenStreetMap's own tile servers forbid bulk
 * downloads, so this only runs against a tile provider the project set up (EXPO_PUBLIC_MAP_STYLE_URL).
 */
export const tilesAvailable = Boolean(MAP_STYLE_URL);

const PACK_PREFIX = 'myto-trail:';
const PAD_M = 3000;

/** Downloads the tiles around a route. Resolves when every tile is saved; `onProgress` gets 0 to 100. */
export async function downloadTiles(slug: string, line: LatLng[], onProgress: (pct: number) => void): Promise<void> {
  const box = bboxOf(line, PAD_M);
  const mapStyle = MAP_STYLE_URL;
  if (!mapStyle || !box) throw new Error('Offline maps need a map provider, which is not set up yet.');
  await deleteTiles(slug);
  await new Promise<void>((resolve, reject) => {
    OfflineManager.createPack(
      { mapStyle, bounds: [box.west, box.south, box.east, box.north], minZoom: 8, maxZoom: 15, metadata: { name: `${PACK_PREFIX}${slug}` } },
      (_pack, status) => { onProgress(Math.round(status.percentage)); if (status.state === 'complete') resolve(); },
      (_pack, err) => reject(new Error(err.message)),
    ).catch(reject);
  });
}

const slugOf = (meta: unknown) => { const n = (meta as { name?: string } | undefined)?.name; return n?.startsWith(PACK_PREFIX) ? n.slice(PACK_PREFIX.length) : undefined; };

/** Whether the tiles for this trail are saved. */
export async function hasTiles(slug: string): Promise<boolean> {
  return (await OfflineManager.getPacks()).some((p) => slugOf(p.metadata) === slug);
}

export async function deleteTiles(slug: string): Promise<void> {
  for (const p of await OfflineManager.getPacks()) if (slugOf(p.metadata) === slug) await OfflineManager.deletePack(p.id);
}
