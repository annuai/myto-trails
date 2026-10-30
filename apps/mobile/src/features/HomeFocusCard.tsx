import { useRouter } from 'expo-router';
import { homeFocus } from '@/lib/homeFocus';
import { todayISO } from '@/lib/dates';
import { soonestTrip, tripStatus, whenText } from '@/lib/tripPlan';
import { useRecorder } from '@/store/recorder';
import { useRides } from '@/store/rides';
import { useTrips } from '@/store/trips';
import { Button } from '@/ui/Button';
import { HeroCard } from '@/ui/HeroCard';
import { Text } from '@/ui/Text';

/** Home under the Rider OS flag: one thing first, chosen from where the rider is (see homeFocus), instead of a stack of competing buttons. */
export function HomeFocusCard() {
  const router = useRouter();
  const recording = useRecorder((s) => s.status === 'running');
  const trips = useTrips((s) => s.trips);
  const rides = useRides((s) => s.rides).filter((r) => !r.sample);
  const today = todayISO();
  const trip = soonestTrip(trips, today);
  const phase = trip ? tripStatus(trip, today) : undefined;
  const last = rides[0];
  const f = homeFocus({
    recording,
    tripPhase: phase === 'active' || phase === 'ready' || phase === 'upcoming' ? phase : undefined,
    lastRide: last ? { id: last.id, endedAt: last.startedAt + ((last.durationSec + (last.pausedSec ?? 0)) * 1000) } : undefined,
    rideCount: rides.length, now: Date.now(),
  });
  if (f.kind === 'resume') return <FocusCard eyebrow="Recording" title="Your ride is on" label="Back to your ride" onPress={() => router.push('/ride/live')} />;
  if (f.kind === 'trip' && trip) {
    const label = f.phase === 'ready' ? 'Start trip' : f.phase === 'active' ? 'Continue trip' : 'Open trip';
    return <FocusCard eyebrow={f.phase === 'upcoming' ? 'Coming up' : 'Trip'} title={trip.name} note={whenText(trip, today)} label={label} onPress={() => router.push(`/trips/${trip.id}`)} />;
  }
  if (f.kind === 'recap') return <FocusCard eyebrow="Just finished" title={last?.name ?? 'Your ride'} label="See your ride" onPress={() => router.push(`/story/${f.rideId}`)} />;
  if (f.kind === 'first') return <FocusCard eyebrow="Welcome" title="Find a trail to ride" note="Search the trails, save one, and plan it. Your rides will show up here." label="Find a trail" onPress={() => router.push('/trails')} />;
  return <FocusCard eyebrow="Next ride" title="Plan your next ride" note="Pick a trail or make a trip with a date and a route for each day." label="Plan a trip" onPress={() => router.push('/trips')} />;
}

function FocusCard({ eyebrow, title, note, label, onPress }: { eyebrow: string; title: string; note?: string; label: string; onPress: () => void }) {
  return (
    <HeroCard eyebrow={eyebrow} title={title}>
      {note ? <Text variant="label" tone="muted">{note}</Text> : null}
      <Button variant="accent" label={label} arrow onPress={onPress} />
    </HeroCard>
  );
}
