import { useState } from 'react';
import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { FileUp, Route as RouteIcon } from 'lucide-react-native';
import { isDuplicate, rideFromGpx } from '@/lib/importRide';
import { asText, distanceKm, durationParts } from '@/lib/units';
import { formatDate } from '@/lib/dates';
import { useRides } from '@/store/rides';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { BackHeader, PageTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function RideLog() {
  const router = useRouter();
  const rides = useRides((s) => s.rides);
  const [note, setNote] = useState<string>();

  // A GPX recorded in another app becomes a ride in this log, so it counts in your year, trips and journals.
  const importGpx = async () => {
    setNote(undefined);
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (picked.canceled) return;
      const a = picked.assets[0]!;
      const text = Platform.OS === 'web' ? await a.file!.text() : await new File(a.uri).text();
      const ride = rideFromGpx(text, Date.now(), a.name);
      if (isDuplicate(useRides.getState().rides, ride)) return setNote('This ride is already in your log.');
      router.push(`/story/${useRides.getState().addRide(ride)}`);
    } catch (e) { setNote(e instanceof Error ? e.message : 'That file could not be read.'); }
  };

  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle>Ride log</PageTitle>
      {rides.length ? (
        <ListCard>
          {rides.map((r) => (
            <Row key={r.id} icon={RouteIcon} label={r.name} sub={`${formatDate(new Date(r.startedAt).toISOString().slice(0, 10))} · ${asText(durationParts(r.durationSec))}${r.submission ? ' · uploaded' : ''}${r.sample ? ' · sample' : ''}`} value={asText(distanceKm(r.distanceKm))} mono onPress={() => router.push(`/story/${r.id}`)} />
          ))}
        </ListCard>
      ) : <EmptyState icon={RouteIcon} title="No rides yet" body="Tap Ride to log your first ride." />}
      <View style={{ marginTop: space[6], gap: space[2] }}>
        <Button variant="soft" icon={FileUp} label="Import a GPX file" onPress={() => void importGpx()} />
        <Text variant="caption" tone="muted">Add a ride recorded in another app. A file with no times gets an estimated time.</Text>
        {note ? <Text variant="label" tone="stop">{note}</Text> : null}
      </View>
    </Screen>
  );
}
