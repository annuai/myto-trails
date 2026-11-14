import { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { RegionRow } from '@/features/offlineMaps/RegionRow';
import { rowState } from '@/features/offlineMaps/rowState';
import { useRegions } from '@/features/offlineMaps/useRegions';
import { groupByCountry } from '@/lib/offlineRegions/manifest';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { BackHeader, PageTitle } from '@/ui/Header';
import { ListCard } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** One country's regions to download or delete: the ones on the phone first, then by name. */
export default function CountryMaps() {
  const { country: param } = useLocalSearchParams<{ country: string }>();
  const country = decodeURIComponent(String(param ?? ''));
  const { regions, have, progress, loading, problem, start, remove, refresh } = useRegions();
  const rows = useMemo(() => groupByCountry(regions, new Set(have.keys())).find((g) => g.country === country)?.regions ?? [], [regions, have, country]);

  return (
    <Screen>
      <BackHeader title="Offline maps" />
      <PageTitle sub="Keep a map and place search on your phone so they work with no signal.">{country}</PageTitle>
      {problem ? <Text variant="label" tone="stop" style={{ marginBottom: space[3] }}>{problem}</Text> : null}
      {rows.length === 0 ? (
        <>
          <Text variant="body" tone="muted">{loading ? 'Loading…' : `No maps for ${country} are available to download right now. Connect to the internet and try again.`}</Text>
          {!loading ? <Button variant="soft" label="Try again" onPress={() => void refresh()} /> : null}
        </>
      ) : (
        <ListCard>
          {rows.map((r) => {
            const pct = progress[r.id];
            return <RegionRow key={r.id} region={r} state={rowState(r, have.get(r.id), pct)} percent={pct} onDownload={() => void start(r)} onDelete={() => remove(r)} />;
          })}
        </ListCard>
      )}
      <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: space[5] }}>Map data © OpenStreetMap contributors</Text>
    </Screen>
  );
}
