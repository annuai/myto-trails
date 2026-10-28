import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ListPlus, Route as RouteIcon, Trash2 } from 'lucide-react-native';
import { formatDate } from '@/lib/dates';
import { progress } from '@/lib/tripChecklist';
import { tripDays, tripTotals } from '@/lib/trips';
import { asText, distanceKm, durationParts } from '@/lib/units';
import { useRides } from '@/store/rides';
import { useTrips } from '@/store/trips';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Checkbox } from '@/ui/Checkbox';
import { Field } from '@/ui/Field';
import { IconButton } from '@/ui/IconButton';
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
  const [draft, setDraft] = useState('');
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
      <SectionTitle>{trip.items?.length ? `Pack list (${progress(trip.items).done}/${progress(trip.items).total})` : 'Pack list'}</SectionTitle>
      {trip.items?.length ? (
        <ListCard>
          {trip.items.map((i) => (
            <View key={i.id} style={{ minHeight: 56, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Checkbox checked={i.done} onChange={() => useTrips.getState().toggleItem(trip.id, i.id)} label={`Packed ${i.text}`} />
              <Text variant="body" tone={i.done ? 'muted' : 'ink'} style={[{ flex: 1 }, i.done ? { textDecorationLine: 'line-through' } : null]}>{i.text}</Text>
              <IconButton icon={Trash2} label={`Remove ${i.text}`} onPress={() => useTrips.getState().removeItem(trip.id, i.id)} plain tone="muted" />
            </View>
          ))}
        </ListCard>
      ) : <Text variant="label" tone="muted">Nothing on the list yet.</Text>}
      <View style={{ marginTop: 12, gap: 12 }}>
        <Field label="Add something" value={draft} onChangeText={setDraft} placeholder="Torch" maxLength={80} onSubmitEditing={() => { useTrips.getState().addItems(trip.id, [draft]); setDraft(''); }} returnKeyType="done" />
        <Button variant="soft" label="Add" disabled={!draft.trim()} onPress={() => { useTrips.getState().addItems(trip.id, [draft]); setDraft(''); }} />
        <Button variant="soft" icon={ListPlus} label="Add the usual things" onPress={() => useTrips.getState().addStarterItems(trip.id)} />
      </View>
      <View style={{ marginTop: 32 }}><Button variant="danger" icon={Trash2} label="Delete this trip" onPress={() => { useTrips.getState().remove(trip.id); router.replace('/trips'); }} /></View>
    </Screen>
  );
}
