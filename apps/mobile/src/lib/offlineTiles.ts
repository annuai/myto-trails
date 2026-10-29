import { OfflineManager } from '@maplibre/maplibre-react-native';
import { mapStyleUrl } from '@/ui/map/style';
import type { LatLng } from './geo';
import { bboxOf } from './fuel';
import { planPack } from './tileMath';

/**
 * Map tiles for one trail or route, saved on the phone so the map works with no signal. They come from OpenFreeMap, which allows an
 * app to download an area for offline use up to 3,000 tiles (or 50 MB) at a time: the area is the route with a margin, and a long
 * route gets less detail rather than more tiles (see tileMath). It needs a connection to download, and nothing to use afterwards.
 */
export const tilesAvailable = true;

const PACK_PREFIX = 'myto-trail:';
const PAD_M = 3000;

/** Downloads the map around a route. Resolves when it is saved; `onProgress` gets 0 to 100. Throws in plain words when it cannot. */
export async function downloadTiles(slug: string, line: LatLng[], onProgress: (pct: number) => void): Promise<void> {
  const box = bboxOf(line, PAD_M);
  if (!box) throw new Error('There is no route to save a map for.');
  const plan = planPack(box);
  if (!plan) throw new Error('This route covers too much ground to save at once. Save it in sections.');
  await deleteTiles(slug);
  await new Promise<void>((resolve, reject) => {
    OfflineManager.createPack(
      { mapStyle: mapStyleUrl(false), bounds: [box.west, box.south, box.east, box.north], minZoom: plan.minZoom, maxZoom: plan.maxZoom, metadata: { name: `${PACK_PREFIX}${slug}` } },
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
