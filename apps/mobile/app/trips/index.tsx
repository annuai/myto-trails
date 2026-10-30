import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarClock, Luggage } from 'lucide-react-native';
import { PlanTripSheet } from '@/features/trip/PlanTripSheet';
import { todayISO } from '@/lib/dates';
import { rangeText, tripStatus, whenText } from '@/lib/tripPlan';
import { tripTotals } from '@/lib/trips';
import { asText, distanceKm } from '@/lib/units';
import { useRides } from '@/store/rides';
import { useTrips, type Trip } from '@/store/trips';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';

/** Trips: planned ahead with a date and days, then ridden. Coming up first, finished and older ones below. */
export default function Trips() {
  const router = useRouter();
  const trips = useTrips((s) => s.trips);
  const rides = useRides((s) => s.rides);
  const [planning, setPlanning] = useState(false);
  const today = todayISO();
  const ahead = trips.filter((t) => ['active', 'ready', 'upcoming'].includes(tripStatus(t, today))).sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));
  const past = trips.filter((t) => !ahead.includes(t));
  const row = (t: Trip) => {
    const km = tripTotals(rides.filter((r) => t.rideIds.includes(r.id))).distanceKm;
    const when = whenText(t, today);
    return <Row key={t.id} icon={t.startDate ? CalendarClock : Luggage} label={t.name} sub={[rangeText(t), when].filter(Boolean).join(' · ') || undefined} value={km ? asText(distanceKm(km)) : undefined} mono onPress={() => router.push(`/trips/${t.id}`)} />;
  };
  return (
    <Screen overlay={<PlanTripSheet open={planning} onClose={() => setPlanning(false)} onCreated={(id) => router.push(`/trips/${id}`)} />}>
      <BackHeader title="You" />
      <PageTitle sub="Pick a start date and the days. You start the trip yourself on its first day, and it records from there.">Trips</PageTitle>
      {trips.length === 0 ? <EmptyState icon={Luggage} title="Plan your first trip" body="Pick the dates, a route for each day and what to pack. We remind you before it starts." /> : null}
      {ahead.length ? <><SectionTitle>Coming up</SectionTitle><ListCard>{ahead.map(row)}</ListCard></> : null}
      {past.length ? <><SectionTitle>Finished and earlier</SectionTitle><ListCard>{past.map(row)}</ListCard></> : null}
      <View style={{ marginTop: space[8] }}><Button label="Plan a trip" onPress={() => setPlanning(true)} /></View>
    </Screen>
  );
}
