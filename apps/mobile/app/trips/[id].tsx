import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Route as RouteIcon, Trash2 } from 'lucide-react-native';
import { formatDate } from '@/lib/dates';
import { tripDays, tripTotals } from '@/lib/trips';
import { asText, distanceKm, durationParts } from '@/lib/units';
import { useRides } from '@/store/rides';
import { useTrips } from '@/store/trips';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Stat } from '@/ui/Stat';
import { Text } from '@/ui/Text';

/** One trip: its days, and what each day and the whole trip came to. */
export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const trip = useTrips((s) => s.trips.find((t) => t.id === id));
  const allRides = useRides((s) => s.rides);
  if (!trip) return <Screen><BackHeader title="Trips" /><Text>Trip not found.</Text></Screen>;
  const rides = allRides.filter((r) => trip.rideIds.includes(r.id));
  const days = tripDays(rides);
  const total = tripTotals(rides);
  return (
    <Screen>
      <BackHeader title="Trips" />
      <PageTitle sub={rides.length ? undefined : "Open a ride's story and choose Add to a trip."}>{trip.name}</PageTitle>
      {rides.length ? (
        <Card style={{ flexDirection: 'row' }}>
          <Stat value={`${total.days}`} label={total.days === 1 ? 'Day' : 'Days'} />
          <Stat parts={distanceKm(total.distanceKm)} label="Ridden" />
          <Stat parts={durationParts(total.durationSec)} label="In the saddle" />
        </Card>
      ) : null}
      {days.map((d, i) => (
        <View key={d.date}>
          <SectionTitle>{`Day ${i + 1} · ${formatDate(d.date)}`}</SectionTitle>
          <ListCard>
            {d.rides.map((r) => <Row key={r.id} icon={RouteIcon} label={r.name} sub={asText(durationParts(r.durationSec))} value={asText(distanceKm(r.distanceKm))} mono onPress={() => router.push(`/story/${r.id}`)} />)}
          </ListCard>
        </View>
      ))}
      <View style={{ marginTop: 32 }}><Button variant="danger" icon={Trash2} label="Delete this trip" onPress={() => { useTrips.getState().remove(trip.id); router.replace('/trips'); }} /></View>
    </Screen>
  );
}
