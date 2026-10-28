import { useRouter } from 'expo-router';
import { Route as RouteIcon } from 'lucide-react-native';
import { asText, distanceKm, durationParts } from '@/lib/units';
import { formatDate } from '@/lib/dates';
import { useRides } from '@/store/rides';
import { EmptyState } from '@/ui/EmptyState';
import { BackHeader, PageTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';

export default function RideLog() {
  const router = useRouter();
  const rides = useRides((s) => s.rides);
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
      ) : <EmptyState icon={RouteIcon} title="No rides yet" body="Tap Record to log your first ride." />}
    </Screen>
  );
}
