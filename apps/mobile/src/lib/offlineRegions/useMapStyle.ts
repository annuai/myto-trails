import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LatLng } from '@/lib/geo';
import { mapStyleUrl } from '@/ui/map/style';
import darkStyle from '../../../assets/offline-map/dark.json';
import liberty from '../../../assets/offline-map/liberty.json';
import { ensureOfflineAssets } from './offlineAssets';
import { FileMode, File as ExpoFile } from 'expo-file-system';
import { chooseStyle, composeLocalStyle, isPmtilesHeader, nextScope, SWITCH_GAP_MS, viewportInRegions, type LocalPaths, type Scope, type StyleJson, type Viewport } from './style';
import type { Installed } from './manifest';
import { listInstalled } from './store';

/** First 8 bytes of a map file look like PMTiles v3; any read error counts as a bad file. */
async function hasPmtilesHeader(r: Installed): Promise<boolean> {
  try {
    const handle = new ExpoFile(r.mapPath).open(FileMode.ReadOnly);
    try { return isPmtilesHeader(await handle.readBytes(8)); } finally { handle.close(); }
  } catch { return false; }
}

type Ready = { installed: Installed[]; paths: LocalPaths };

/**
 * The map style string for MapLibre's `mapStyle` (plus a failure callback): the local style while any part of the visible map overlaps a downloaded region,
 * the online one otherwise. `onViewChange` takes the view (centre and bounds) on every region change; the style only switches when the view starts or stops overlapping a region, and at most once per 3 seconds. A local style that fails to load is dropped for the rest of the mount. The first view is read once the installed list loads,
 * so a map that opens inside a region reloads its style once, shortly after mount.
 */
export function useMapStyle(dark: boolean, center?: LatLng): { style: string; isLocal: boolean; onLoadFailed: () => void; onViewChange: (v: Viewport) => void } {
  const [ready, setReady] = useState<Ready>();
  const [inside, setInside] = useState(false);
  const [localFailed, setLocalFailed] = useState(false);
  const installedRef = useRef<Installed[] | undefined>(undefined);
  const latest = useRef<Viewport | undefined>(center ? { center } : undefined);
  const readyRef = useRef(false);
  const assetsTriedAt = useRef(-Infinity);
  const scope = useRef<Scope>({ inside: false, at: -Infinity });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const live = useRef(true);
  const again = useRef<() => void>(() => undefined);

  const evaluate = useCallback(() => {
    const installed = installedRef.current;
    if (!installed || !latest.current || !live.current) return;
    clearTimeout(timer.current);
    const now = Date.now();
    const { scope: next, waitMs } = nextScope(scope.current, viewportInRegions(latest.current, installed), now);
    if (waitMs > 0) { timer.current = setTimeout(() => again.current(), waitMs); return; }
    scope.current = next;
    setInside(next.inside);
    // Copy the bundled assets while the view overlaps a region; a failed copy is retried, at most once per hold window.
    if (next.inside && !readyRef.current && now - assetsTriedAt.current >= SWITCH_GAP_MS) {
      assetsTriedAt.current = now;
      ensureOfflineAssets()
        .then((paths) => { if (live.current) { readyRef.current = true; setReady({ installed, paths }); } })
        .catch(() => { if (live.current) { clearTimeout(timer.current); timer.current = setTimeout(() => again.current(), SWITCH_GAP_MS); } });
    }
  }, []);

  useEffect(() => { again.current = evaluate; }, [evaluate]);

  useEffect(() => {
    live.current = true;
    (async () => {
      const all = await listInstalled();
      const good: Installed[] = [];
      for (const r of all) if (await hasPmtilesHeader(r)) good.push(r);
      installedRef.current = good;
      evaluate();
    })().catch(() => undefined);
    return () => { live.current = false; clearTimeout(timer.current); };
  }, [evaluate]);

  const onViewChange = useCallback((v: Viewport) => { latest.current = v; evaluate(); }, [evaluate]);

  const local = useMemo(() => (ready ? JSON.stringify(composeLocalStyle((dark ? darkStyle : liberty) as unknown as StyleJson, ready.installed, ready.paths)) : undefined), [ready, dark]);
  // Only a failure of the local style is remembered; the online URL failing (e.g. no signal) must not block the local style arriving later.
  const chosen = chooseStyle(mapStyleUrl(dark), local, localFailed, inside);
  return { ...chosen, onLoadFailed: () => { if (chosen.isLocal) setLocalFailed(true); }, onViewChange };
}
