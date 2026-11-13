import { useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { space } from '@/theme/tokens';
import { nowMs } from '@/lib/clock';
import { VISIT_IDS, visitOf } from '@/lib/story/visits';
import { usePillion } from '@/store/pillion';
import { Button } from '@/ui/Button';
import { BackHeader, PageTitle } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { TrailDog } from '@/ui/mascot/TrailDog';
import { mascotPreview } from './mascot.tokens';

/** The trail dog walking onto its rock and looking up; Replay mounts it again. */
export default function MascotPreview() {
  const [run, setRun] = useState(0);
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <Screen>
      <BackHeader title="Trail dog" />
      <PageTitle sub="Dev only.">Walk onto the rock</PageTitle>
      <View style={{ alignItems: 'center', paddingVertical: space[3] }}>
        <TrailDog key={run} width={mascotPreview.width} />
      </View>
      <Button label="Replay" onPress={() => setRun((n) => n + 1)} />
      <PageTitle sub="Opens the same dialog a notification does.">Pillion visits</PageTitle>
      <View style={{ gap: space[2] }}>
        {VISIT_IDS.map((id) => <Button key={id} variant="soft" label={id} onPress={() => usePillion.getState().show(visitOf(id, { trip: id === 'map' ? { id: 'demo', name: 'The Spiti loop' } : undefined }), `dev:${id}:${nowMs()}`, nowMs())} />)}
      </View>
    </Screen>
  );
}
