import { useEffect, useState } from 'react';
import type { LatLng } from '@/lib/geo';
import { mapStyleUrl } from '@/ui/map/style';
import liberty from '../../../assets/offline-map/liberty.json';
import { ensureOfflineAssets } from './offlineAssets';
import { composeLocalStyle, regionAt, type StyleJson } from './style';
import { listInstalled } from './store';

/**
 * The map style as a string for MapLibre's `mapStyle`: the online style, or the local one when the map first opens
 * inside a downloaded region. Decided once, after the installed list loads; until then (and outside a region) it is online.
 * Starting inside a region therefore reloads the style once, shortly after mount. It never switches again.
 */
export function useMapStyle(dark: boolean, center?: LatLng): string {
  const [local, setLocal] = useState<string>();
  useEffect(() => {
    if (!center) return;
    let live = true;
    (async () => {
      const installed = await listInstalled();
      if (!regionAt(center, installed)) return;
      const paths = await ensureOfflineAssets();
      if (live) setLocal(JSON.stringify(composeLocalStyle(liberty as unknown as StyleJson, installed, paths)));
    })().catch(() => undefined);
    return () => { live = false; };
    // Once per mount, from the initial centre only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return local ?? mapStyleUrl(dark);
}
