import { useEffect, useState } from 'react';
import type { LatLng } from '@/lib/geo';
import { mapStyleUrl } from '@/ui/map/style';
import liberty from '../../../assets/offline-map/liberty.json';
import { ensureOfflineAssets } from './offlineAssets';
import { FileMode, File as ExpoFile } from 'expo-file-system';
import { chooseStyle, composeLocalStyle, isPmtilesHeader, regionAt, type StyleJson } from './style';
import type { Installed } from './manifest';
import { listInstalled } from './store';

/** First 8 bytes of a map file look like PMTiles v3; any read error counts as a bad file. */
async function hasPmtilesHeader(r: Installed): Promise<boolean> {
  try {
    const handle = new ExpoFile(r.mapPath).open(FileMode.ReadOnly);
    try { return isPmtilesHeader(await handle.readBytes(8)); } finally { handle.close(); }
  } catch { return false; }
}

/**
 * The map style string for MapLibre's `mapStyle` (plus a failure callback): the online style, or the local one when the map first opens
 * inside a downloaded region. Decided once, after the installed list loads; until then (and outside a region) it is online.
 * Starting inside a region therefore reloads the style once, shortly after mount. It never switches again.
 */
export function useMapStyle(dark: boolean, center?: LatLng): { style: string; isLocal: boolean; onLoadFailed: () => void } {
  const [local, setLocal] = useState<string>();
  const [localFailed, setLocalFailed] = useState(false);
  useEffect(() => {
    if (!center) return;
    let live = true;
    (async () => {
      const all = await listInstalled();
      const installed: Installed[] = [];
      for (const r of all) if (await hasPmtilesHeader(r)) installed.push(r);
      if (!regionAt(center, installed)) return;
      const paths = await ensureOfflineAssets();
      if (live) setLocal(JSON.stringify(composeLocalStyle(liberty as unknown as StyleJson, installed, paths)));
    })().catch(() => undefined);
    return () => { live = false; };
    // Once per mount, from the initial centre only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Only a failure of the local style is remembered; the online URL failing (e.g. no signal) must not block the local style arriving later.
  const chosen = chooseStyle(mapStyleUrl(dark), local, localFailed);
  return { ...chosen, onLoadFailed: () => { if (chosen.isLocal) setLocalFailed(true); } };
}
