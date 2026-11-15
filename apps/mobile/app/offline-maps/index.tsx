import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Globe } from 'lucide-react-native';
import { useRegions } from '@/features/offlineMaps/useRegions';
import { groupByCountry } from '@/lib/offlineRegions/manifest';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { BackHeader, PageTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** The countries with maps to download; each opens its own page of regions, so a long list of states stays off this one. */
export default function OfflineMaps() {
  const router = useRouter();
  const { regions, have, loading, refresh } = useRegions();
  const groups = useMemo(() => groupByCountry(regions, new Set(have.keys())), [regions, have]);

  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle sub="Keep a map and place search on your phone so they work with no signal.">Offline maps</PageTitle>
      {groups.length === 0 ? (
        <>
          <Text variant="body" tone="muted">{loading ? 'Loading…' : 'Maps are not available to download right now. Connect to the internet and try again.'}</Text>
          {!loading ? <Button variant="soft" label="Try again" onPress={() => void refresh()} /> : null}
        </>
      ) : (
        <ListCard>
          {groups.map((g) => {
            const onPhone = g.regions.filter((r) => have.has(r.id)).length;
            return <Row key={g.country} icon={Globe} label={g.country} sub={`${g.regions.length} ${g.regions.length === 1 ? 'region' : 'regions'}${onPhone ? ` · ${onPhone} on this phone` : ''}`} onPress={() => router.push(`/offline-maps/${encodeURIComponent(g.country)}`)} />;
          })}
        </ListCard>
      )}
      <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: space[5] }}>Map data © OpenStreetMap contributors</Text>
    </Screen>
  );
}
