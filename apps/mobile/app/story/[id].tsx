import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Download, Trash2, Upload } from 'lucide-react-native';
import { exportGpx } from '@/lib/exportGpx';
import { buildGpx } from '@/lib/gpx';
import { segmentsOf, trackStats } from '@/lib/track';
import { asText, distanceKm, durationParts, speedKmh } from '@/lib/units';
import { formatDate } from '@/lib/dates';
import { useRides } from '@/store/rides';
import { Theme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { StatusChip } from '@/ui/Chip';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { RideMap } from '@/ui/RideMap';
import { Columns } from '@/ui/Columns';
import { Screen } from '@/ui/Screen';
import { Measure } from '@/ui/Measure';
import { Stat } from '@/ui/Stat';
import { Text } from '@/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

export default function Story() {
  return <Theme mode="dark"><StoryBody /></Theme>;
}

function StoryBody() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const ride = useRides((s) => s.rides.find((r) => r.id === id));
  if (!ride) return <Screen><BackHeader /><Text>Ride not found.</Text></Screen>;
  const sub = ride.submission;
  const gapM = trackStats(segmentsOf(ride.points, ride.breaks)).gapM;
  return (
    <Screen>
      <BackHeader title="Ride story" />
      <PageTitle sub={formatDate(new Date(ride.startedAt).toISOString().slice(0, 10)) + (ride.sample ? ' · sample' : '')}>{ride.name}</PageTitle>
      <Columns
        left={<>
      <View style={{ backgroundColor: c.accent, borderRadius: radius.card, padding: 24, gap: 4 }}>
        <Text variant="label" style={{ color: c.accentInk }}>You rode</Text>
        <Measure parts={distanceKm(ride.distanceKm)} size="liveCompact" color={c.accentInk} />
        <Text variant="label" style={{ color: c.accentInk }}>in {asText(durationParts(ride.durationSec))}</Text>
      </View>
      <SectionTitle>Highlights</SectionTitle>
      <Card style={{ flexDirection: 'row' }}>
        <Stat parts={speedKmh(ride.maxKmh)} label="Top speed" />
        <Stat value={`${ride.waypoints.length}`} label="Waypoints" />
        {gapM > 0 ? <Stat parts={distanceKm(+(gapM / 1000).toFixed(1))} label="GPS gap" /> : <Stat value={`${ride.points.length}`} label="Points" />}
      </Card>
        </>}
        right={<>
      <View style={{ marginTop: 0 }}><RideMap radius={radius.card} dark points={ride.points} waypoints={ride.waypoints} /></View>
      <SectionTitle>Share it</SectionTitle>
      {sub ? (
        <Card style={{ gap: 10 }}>
          <StatusChip status="good" label="Sent for review" />
          <Text variant="label" tone="muted">{sub.trailName}. Moderators check it before anything is published.</Text>
        </Card>
      ) : null}
      <View style={{ gap: 12, marginTop: sub ? 12 : 0 }}>
        <Button icon={Upload} label={sub ? 'Upload again' : 'Upload to Moto Trails'} arrow onPress={() => router.push(`/story/submit?id=${ride.id}`)} />
        <Button variant="soft" icon={Download} label="Export GPX file" onPress={() => exportGpx(ride.name, buildGpx(ride.name, ride.points, ride.waypoints, ride.breaks))} />
        <Button variant="danger" icon={Trash2} label="Delete this ride" onPress={() => { useRides.getState().removeRide(ride.id); router.replace('/rides'); }} />
      </View>
        </>}
      />
    </Screen>
  );
}
