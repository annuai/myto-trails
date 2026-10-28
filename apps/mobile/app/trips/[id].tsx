import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ListPlus, Pencil, Play, Route as RouteIcon, Square, Trash2 } from 'lucide-react-native';
import { PlanTripSheet } from '@/features/trip/PlanTripSheet';
import { startTodaysRide, startTrip } from '@/features/trip/startTrip';
import { TripDaySheet } from '@/features/trip/TripDaySheet';
import { dayIndexOn, dayDate, expiringBefore, lastDate, rangeText, tripStatus, whenText } from '@/lib/tripPlan';
import { formatDate, formatShort, todayISO } from '@/lib/dates';
import { tripDays, tripTotals } from '@/lib/trips';
import { asText, distanceKm, durationParts } from '@/lib/units';
import { useProfile } from '@/store/profile';
import { useRides } from '@/store/rides';
import { useTodos } from '@/store/todos';
import { useTrips } from '@/store/trips';
import { size, space } from '@/theme/tokens';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Checkbox } from '@/ui/Checkbox';
import { StatusChip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { IconButton } from '@/ui/IconButton';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Stat } from '@/ui/Stat';
import { Text } from '@/ui/Text';

/** One trip: when it starts and how long, a route for each day, the pack list (to-dos due on the start date), and the rides recorded on it. */
export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const trip = useTrips((s) => s.trips.find((t) => t.id === id));
  const allRides = useRides((s) => s.rides);
  const todos = useTodos((s) => s.todos).filter((t) => t.tripId === id);
  const { licence, vehicle } = useProfile();
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [dayOpen, setDayOpen] = useState<number | null>(null);
  if (!trip) return <Screen><BackHeader title="Trips" /><Text>Trip not found.</Text></Screen>;

  const today = todayISO();
  const status = tripStatus(trip, today);
  const rides = allRides.filter((r) => trip.rideIds.includes(r.id));
  const days = tripDays(rides);
  const total = tripTotals(rides);
  const todayIndex = dayIndexOn(trip, today);
  const expiring = trip.startDate ? expiringBefore([{ label: 'Driving licence', validTill: licence?.validTill }, { label: 'Insurance', validTill: vehicle?.insuranceValidTill }, { label: 'PUC', validTill: vehicle?.pucValidTill }], lastDate({ ...trip, startDate: trip.startDate })) : [];
  const addDraft = () => { useTrips.getState().addTodos(trip.id, [draft]); setDraft(''); };
  const left = todos.filter((t) => !t.done).length;

  return (
    <Screen overlay={<>
      <PlanTripSheet key={trip.id + (editing ? 'e' : '')} open={editing} trip={trip} onClose={() => setEditing(false)} />
      <TripDaySheet trip={trip} index={dayOpen} onClose={() => setDayOpen(null)} />
    </>}>
      <BackHeader title="Trips" right={trip.startDate ? <IconButton icon={Pencil} label="Change the trip" onPress={() => setEditing(true)} plain /> : undefined} />
      <PageTitle sub={trip.startDate ? [rangeText(trip), `${trip.days?.length ?? 1} ${(trip.days?.length ?? 1) === 1 ? 'day' : 'days'}`, whenText(trip, today)].filter(Boolean).join(' · ') : rides.length ? undefined : "Open a ride's story and choose Add to a trip."}>{trip.name}</PageTitle>

      {status === 'ready' ? (
        <View style={{ gap: space[3] }}>
          <Button big variant="accent" icon={Play} label="Start trip" onPress={() => startTrip(trip.id, router)} />
          <Text variant="label" tone="muted">It records from here and follows today's route. You can also start later in the day.</Text>
        </View>
      ) : status === 'active' ? (
        <View style={{ gap: space[3] }}>
          <Button big variant="accent" icon={Play} label={`Record day ${(todayIndex ?? 0) + 1}`} onPress={() => startTodaysRide(trip.id, router)} />
          <Button variant="soft" icon={Square} label="End trip" onPress={() => useTrips.getState().end(trip.id)} />
        </View>
      ) : status === 'upcoming' ? (
        <Text variant="label" tone="muted">{whenText(trip, today)}. On the first day, tap Start trip here to begin recording.</Text>
      ) : null}

      {expiring.length ? (
        <View style={{ marginTop: space[4] }}>
          <Banner eyebrow="Documents" title={`${expiring.map((d) => `${d.label} (${formatShort(d.validTill)})`).join(', ')} run out before the trip ends. Renew first.`} onPress={() => router.push('/documents')} />
        </View>
      ) : null}

      {trip.startDate ? (
        <>
          <SectionTitle>Days</SectionTitle>
          <ListCard>
            {(trip.days ?? []).map((d, i) => (
              <Row key={d.id} icon={RouteIcon} label={`Day ${i + 1} · ${formatDate(dayDate(trip.startDate!, i))}`} sub={[d.route?.name, d.note].filter(Boolean).join(' · ') || 'Add a route'}
                right={d.route?.kind === 'trail' ? <StatusChip status={d.route.status} label={d.route.statusLabel} /> : undefined} onPress={() => setDayOpen(i)} />
            ))}
          </ListCard>
        </>
      ) : null}

      <SectionTitle>{todos.length ? `Pack list (${todos.length - left}/${todos.length})` : 'Pack list'}</SectionTitle>
      {todos.length ? (
        <ListCard>
          {todos.map((t) => (
            <View key={t.id} style={{ minHeight: size.button, paddingHorizontal: space[2], flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
              <Checkbox checked={t.done} onChange={() => useTodos.getState().toggle(t.id)} label={`Packed ${t.title}`} />
              <Text variant="body" tone={t.done ? 'muted' : 'ink'} style={[{ flex: 1 }, t.done ? { textDecorationLine: 'line-through' } : null]}>{t.title}</Text>
              <IconButton icon={Trash2} label={`Remove ${t.title}`} onPress={() => useTodos.getState().remove(t.id)} plain tone="muted" />
            </View>
          ))}
        </ListCard>
      ) : <Text variant="label" tone="muted">Nothing on the list yet.</Text>}
      {trip.startDate ? <Text variant="caption" tone="muted" style={{ marginTop: space[2] }}>These are to-dos due on {formatDate(trip.startDate)}, so they show under Due soon and remind you.</Text> : null}
      <View style={{ marginTop: space[3], gap: space[3] }}>
        <Field label="Add something" value={draft} onChangeText={setDraft} placeholder="Torch" maxLength={80} onSubmitEditing={addDraft} returnKeyType="done" />
        <Button variant="soft" label="Add" disabled={!draft.trim()} onPress={addDraft} />
        <Button variant="soft" icon={ListPlus} label="Add the usual things" onPress={() => useTrips.getState().addStarterTodos(trip.id)} />
      </View>

      {rides.length ? (
        <>
          <SectionTitle>Rides</SectionTitle>
          <Card style={{ flexDirection: 'row' }}>
            <Stat value={`${total.days}`} label={total.days === 1 ? 'Day ridden' : 'Days ridden'} />
            <Stat parts={distanceKm(total.distanceKm)} label="Ridden" />
            <Stat parts={durationParts(total.durationSec)} label="In the saddle" />
          </Card>
          {days.map((d) => (
            <View key={d.date} style={{ marginTop: space[3] }}>
              <ListCard>
                {d.rides.map((r) => <Row key={r.id} icon={RouteIcon} label={r.name} sub={`${formatShort(d.date)} · ${asText(durationParts(r.durationSec))}`} value={asText(distanceKm(r.distanceKm))} mono onPress={() => router.push(`/story/${r.id}`)} />)}
              </ListCard>
            </View>
          ))}
        </>
      ) : null}

      <View style={{ marginTop: space[8] }}><Button variant="danger" icon={Trash2} label="Delete this trip" onPress={() => { useTrips.getState().remove(trip.id); router.replace('/trips'); }} /></View>
    </Screen>
  );
}
