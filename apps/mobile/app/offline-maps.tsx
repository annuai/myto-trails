import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { RegionRow } from '@/features/offlineMaps/RegionRow';
import { rowState } from '@/features/offlineMaps/rowState';
import type { Installed, Region } from '@/lib/offlineRegions/manifest';
import { deleteRegion, downloadRegion, listInstalled, loadManifest } from '@/lib/offlineRegions/store';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** Plain words for whatever went wrong; the store already words its own errors, anything else gets a generic line. */
const plain = (e: unknown, fallback: string) => (e instanceof Error && e.message && !/\n\s+at /.test(e.message) ? e.message : fallback);

/** Regions the rider can keep on the phone: a map that draws and a place search that works with no signal. */
export default function OfflineMaps() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [installed, setInstalled] = useState<Installed[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string>();

  const refresh = useCallback(async () => {
    const [list, mine] = await Promise.all([loadManifest().catch(() => [] as Region[]), listInstalled().catch(() => [] as Installed[])]);
    setRegions(list); setInstalled(mine); setLoading(false);
  }, []);
  useEffect(() => {
    let live = true;
    void Promise.all([loadManifest().catch(() => [] as Region[]), listInstalled().catch(() => [] as Installed[])]).then(([list, mine]) => { if (live) { setRegions(list); setInstalled(mine); setLoading(false); } });
    return () => { live = false; };
  }, []);
  // Coming back to this screen after a download finished elsewhere should show it.
  useFocusEffect(useCallback(() => { void listInstalled().then(setInstalled).catch(() => undefined); }, []));

  const have = useMemo(() => new Map(installed.map((i) => [i.id, i])), [installed]);
  const rows = useMemo(() => [...regions].sort((a, b) => Number(have.has(b.id)) - Number(have.has(a.id)) || a.name.localeCompare(b.name)), [regions, have]);

  const start = async (region: Region) => {
    if (progress[region.id] !== undefined) return;
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
  };
  const remove = (region: Region) => Alert.alert(`Delete ${region.name}?`, 'Its map and place search leave this phone. You can download them again later.', [
    { text: 'Keep', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => { void deleteRegion(region.id).then(() => listInstalled()).then(setInstalled).catch((e) => setProblem(plain(e, `Could not delete ${region.name}.`))); } },
  ]);

  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle sub="Keep a map and place search on your phone so they work with no signal.">Offline maps</PageTitle>
      {problem ? <Text variant="label" tone="stop" style={{ marginBottom: space[3] }}>{problem}</Text> : null}
      {rows.length === 0 ? (
        <>
          <Text variant="body" tone="muted">{loading ? 'Loading…' : 'Maps are not available to download right now. Connect to the internet and try again.'}</Text>
          {!loading ? <Button variant="soft" label="Try again" onPress={() => { setLoading(true); void refresh(); }} /> : null}
        </>
      ) : (
        <>
          <SectionTitle first>Regions</SectionTitle>
          <ListCard>
            {rows.map((r) => {
              const pct = progress[r.id];
              return <RegionRow key={r.id} region={r} state={rowState(r, have.get(r.id), pct)} percent={pct} onDownload={() => void start(r)} onDelete={() => remove(r)} />;
            })}
          </ListCard>
        </>
      )}
      <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: space[5] }}>Map data © OpenStreetMap contributors</Text>
    </Screen>
  );
}
