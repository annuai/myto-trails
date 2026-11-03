import { useState } from 'react';
import { View } from 'react-native';
import { OSM_DISCLAIMER } from '@/features/osm/copy';
import { osmConfigured } from '@/lib/osm';
import { connectOsm, disconnectOsm, hasOsmToken } from '@/lib/osmApi';
import { shareQueued } from '@/lib/osmShare';
import { useOsm } from '@/store/osm';
import { space } from '@/theme/tokens';
import { Card } from '@/ui/Card';
import { Checkbox } from '@/ui/Checkbox';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** Sharing rides with OpenStreetMap: the switch, the account it uses, and what is sent. */
export default function OsmSettings() {
  const enabled = useOsm((s) => s.enabled && s.asked);
  const connected = useOsm((s) => s.connected);
  const shared = useOsm((s) => s.shared);
  const waiting = useOsm((s) => s.pending.length);
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);
  const connect = async () => {
    setBusy(true); setProblem(undefined);
    const r = await connectOsm();
    setBusy(false);
    if (!r.ok) return setProblem(r.error);
    useOsm.getState().setConnected(await hasOsmToken());
    void shareQueued();
  };
  const disconnect = async () => { await disconnectOsm(); useOsm.getState().setConnected(false); };
  return (
    <Screen>
      <BackHeader title="OpenStreetMap" />
      <PageTitle sub="Help the free map under Myto Moto get better.">Share rides with OpenStreetMap</PageTitle>
      <ListCard>
        <Row label="Share my rides" sub="After each ride, send its route to OpenStreetMap" chevron={false}
          right={<Checkbox checked={enabled} label="Share my rides with OpenStreetMap" onChange={(v) => { useOsm.getState().setEnabled(v); if (v) void shareQueued(); }} />} />
        <Row label="OpenStreetMap account" sub={connected ? 'Signed in. Rides are sent under it.' : 'Not signed in. Needed to send rides.'} value={busy ? 'Opening…' : connected ? 'Sign out' : 'Sign in'} chevron={false} onPress={() => void (connected ? disconnect() : connect())} />
      </ListCard>
      {problem ? <Text variant="label" tone="stop" style={{ marginTop: space[3] }}>{problem}</Text> : null}
      {!osmConfigured() ? <Text variant="label" tone="caution" style={{ marginTop: space[3] }}>Sharing is not set up in this build yet, so nothing is sent.</Text> : null}
      <SectionTitle>What is sent</SectionTitle>
      <Card style={{ gap: space[3] }}>
        <Text variant="label" tone="muted">{OSM_DISCLAIMER}</Text>
        <View style={{ gap: space[1] }}>
          <Text variant="label">{`${shared} ${shared === 1 ? 'ride' : 'rides'} shared${waiting ? ` · ${waiting} waiting to be sent` : ''}`}</Text>
        </View>
      </Card>
    </Screen>
  );
}
