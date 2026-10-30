import { useRouter } from 'expo-router';
import { BookOpen, CalendarDays, ClipboardList, Luggage, Motorbike, Route as RouteIcon, Stamp } from 'lucide-react-native';
import { View } from 'react-native';
import { formatDate, todayISO } from '@/lib/dates';
import { soonestTrip, tripStatus, whenText } from '@/lib/tripPlan';
import { asText, durationParts } from '@/lib/units';
import { useDistanceUnit } from '@/store/region';
import { useRecorder } from '@/store/recorder';
import { useRides } from '@/store/rides';
import { useTrips } from '@/store/trips';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';

const UPCOMING = new Set(['active', 'ready', 'upcoming']);
const SHOWN = 8;

/** Rides (Rider OS): what is on now, what is coming up, and what you have ridden, in one place. Hidden unless the build sets the flag.
 *  Its path is /my-rides because /rides is the ride log. */
export default function RidesTab() {
  useDistanceUnit();
  const router = useRouter();
  const recording = useRecorder((s) => s.status === 'running');
  const trips = useTrips((s) => s.trips);
  const rides = useRides((s) => s.rides).filter((r) => !r.sample);
  const today = todayISO();
  const upcoming = trips.filter((t) => UPCOMING.has(tripStatus(t, today))).sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));
  const first = soonestTrip(trips, today);
  return (
    <Screen tabs brand>
      <PageTitle>Rides</PageTitle>
      {recording ? (
        <>
          <SectionTitle>On now</SectionTitle>
          <ListCard><Row icon={Motorbike} label="Your ride is on" sub="Open the live screen" onPress={() => router.push('/ride/live')} /></ListCard>
        </>
      ) : null}
      <SectionTitle>Coming up</SectionTitle>
      {upcoming.length ? (
        <ListCard>
          {upcoming.map((t) => <Row key={t.id} icon={Luggage} label={t.name} sub={whenText(t, today)} value={t.id === first?.id ? 'Next' : undefined} onPress={() => router.push(`/trips/${t.id}`)} />)}
        </ListCard>
      ) : <EmptyState icon={Luggage} title="No trips planned" body="Plan a trip with a date, a route for each day and a pack list." />}
      <View style={{ marginTop: space[3] }}><Button variant="soft" label="Plan a trip" onPress={() => router.push('/trips')} /></View>

      <SectionTitle>Ridden</SectionTitle>
      {rides.length ? (
        <>
          <ListCard>
            {rides.slice(0, SHOWN).map((r) => (
              <Row key={r.id} icon={RouteIcon} label={r.name} sub={`${formatDate(new Date(r.startedAt).toISOString().slice(0, 10))} · ${asText(durationParts(r.durationSec))}${r.submission ? ' · sent for review' : ''}`} onPress={() => router.push(`/story/${r.id}`)} />
            ))}
          </ListCard>
          <View style={{ marginTop: space[3] }}><Button variant="soft" label={`All ${rides.length} rides`} arrow onPress={() => router.push('/rides')} /></View>
        </>
      ) : <EmptyState icon={RouteIcon} title="No rides yet" body="Tap Record to log your first ride." />}

      <SectionTitle>More</SectionTitle>
      <ListCard>
        <Row icon={BookOpen} label="Journal" onPress={() => router.push('/journal')} />
        <Row icon={ClipboardList} label="To-do list" onPress={() => router.push('/todos')} />
        <Row icon={CalendarDays} label="Your year" onPress={() => router.push('/recap')} />
        <Row icon={Stamp} label="Trails ridden" onPress={() => router.push('/passport')} />
      </ListCard>
    </Screen>
  );
}
