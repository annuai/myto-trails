import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { Installed, Region } from '@/lib/offlineRegions/manifest';
import { deleteRegion, downloadRegion, isDownloading, listInstalled, loadManifest } from '@/lib/offlineRegions/store';

/** Plain words for whatever went wrong; the store already words its own errors, anything else gets a generic line. */
const plain = (e: unknown, fallback: string) => (e instanceof Error && e.message && !/\n\s+at /.test(e.message) ? e.message : fallback);

/** What the offline maps screens share: the published regions, what is on the phone, download progress, and start / delete. */
export function useRegions() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [installed, setInstalled] = useState<Installed[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string>();

  // A second tap while it runs joins the same download (the store keeps one run per region), so no guard is needed here.
  const start = useCallback(async (region: Region) => {
    setProblem(undefined);
    setProgress((p) => ({ ...p, [region.id]: 0 }));
    try {
      await downloadRegion(region, (pct) => setProgress((p) => ({ ...p, [region.id]: Math.round(pct) })));
    } catch (e) {
      setProblem(plain(e, `Could not download ${region.name}. Check your signal and try again.`));
    } finally {
      setProgress(({ [region.id]: _gone, ...rest }) => rest);
      setInstalled(await listInstalled().catch(() => [] as Installed[]));
    }
  }, []);
  // A download keeps running when a screen is left; on coming back, join it so the row shows it as downloading (and hears its progress) instead of offering Download or Delete.
  const join = useCallback((list: Region[]) => { for (const r of list) if (isDownloading(r.id)) void start(r); }, [start]);
  const refresh = useCallback(async () => {
    setLoading(true);
    const [list, mine] = await Promise.all([loadManifest().catch(() => [] as Region[]), listInstalled().catch(() => [] as Installed[])]);
    setRegions(list); setInstalled(mine); setLoading(false); join(list);
  }, [join]);
  useEffect(() => {
    let live = true;
    void Promise.all([loadManifest().catch(() => [] as Region[]), listInstalled().catch(() => [] as Installed[])]).then(([list, mine]) => { if (live) { setRegions(list); setInstalled(mine); setLoading(false); join(list); } });
    return () => { live = false; };
  }, [join]);
  // Coming back to a screen after a download finished elsewhere should show it.
  useFocusEffect(useCallback(() => { void listInstalled().then(setInstalled).catch(() => undefined); }, []));

  const have = useMemo(() => new Map(installed.map((i) => [i.id, i])), [installed]);

  const remove = (region: Region) => Alert.alert(`Delete ${region.name}?`, 'Its map and place search leave this phone. You can download them again later.', [
    { text: 'Keep', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => { void deleteRegion(region.id).then(() => listInstalled()).then(setInstalled).catch((e) => setProblem(plain(e, `Could not delete ${region.name}.`))); } },
  ]);

  return { regions, have, progress, loading, problem, start, remove, refresh };
}
