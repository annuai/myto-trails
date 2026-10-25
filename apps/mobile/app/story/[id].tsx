import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Download, Trash2, Upload } from 'lucide-react-native';
import { exportGpx } from '@/lib/exportGpx';
import { buildGpx } from '@/lib/gpx';
import { duration, km } from '@/lib/format';
import { formatDate } from '@/lib/dates';
import { useRides } from '@/store/rides';
import { Theme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { StatusChip } from '@/ui/Chip';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { OsmMap } from '@/ui/map/OsmMap';
import { Screen } from '@/ui/Screen';
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
  return (
    <Screen>
      <BackHeader title="Ride story" />
      <PageTitle sub={formatDate(new Date(ride.startedAt).toISOString().slice(0, 10)) + (ride.sample ? ' · sample' : '')}>{ride.name}</PageTitle>
      <View style={{ backgroundColor: '#8fbbdc', borderRadius: radius.card, padding: 24, gap: 4 }}>
        <Text variant="label" style={{ color: '#121211' }}>You rode</Text>
        <Text variant="live" style={{ color: '#121211', fontSize: 56, lineHeight: 62 }}>{km(ride.distanceKm)} km</Text>
        <Text variant="label" style={{ color: '#121211' }}>in {duration(ride.durationSec)}</Text>
      </View>
      <View style={{ marginTop: 12 }}><OsmMap height={240} radius={radius.card} dark track={ride.points} waypoints={ride.waypoints} /></View>
      <SectionTitle>Highlights</SectionTitle>
      <Card style={{ flexDirection: 'row' }}>
        <Stat value={`${ride.maxKmh}`} label="Top km/h" />
        <Stat value={`${ride.waypoints.length}`} label="Waypoints" />
        <Stat value={`${ride.points.length}`} label="Points" />
      </Card>
      <SectionTitle>Share it</SectionTitle>
      {sub ? (
        <Card style={{ gap: 10 }}>
          <StatusChip status="good" label="Sent for review" />
          <Text variant="label" tone="muted">{sub.trailName}. Moderators check it before anything is published.</Text>
        </Card>
      ) : null}
      <View style={{ gap: 12, marginTop: sub ? 12 : 0 }}>
        <Button icon={Upload} label={sub ? 'Upload again' : 'Upload to Moto Trails'} arrow onPress={() => router.push(`/story/submit?id=${ride.id}`)} />
        <Button variant="soft" icon={Download} label="Export GPX file" onPress={() => exportGpx(ride.name, buildGpx(ride.name, ride.points, ride.waypoints))} />
        <Button variant="danger" icon={Trash2} label="Delete this ride" onPress={() => { useRides.getState().removeRide(ride.id); router.replace('/rides'); }} />
      </View>
    </Screen>
  );
}
