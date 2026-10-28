import { useRouter } from 'expo-router';
import { BookOpen } from 'lucide-react-native';
import { groupByRide, summarise } from '@/lib/journalEntries';
import { journalDate, journalTitle } from '@/lib/journalTitle';
import { useJournal } from '@/store/journal';
import { useRides } from '@/store/rides';
import { EmptyState } from '@/ui/EmptyState';
import { BackHeader, PageTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';

/** Every ride that has a journal, most recently written first. */
export default function Journals() {
  const router = useRouter();
  const entries = useJournal((s) => s.entries);
  const rides = useRides((s) => s.rides);
  const groups = groupByRide(entries);
  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle sub="Notes, voice and photos from your rides. They stay on this phone.">Ride journal</PageTitle>
      {groups.length ? (
        <ListCard>
          {groups.map((g) => (
            <Row key={g.rideKey} icon={BookOpen} label={journalTitle(g.rideKey, rides)} sub={`${journalDate(g.rideKey)} · ${summarise(g.entries)}`} onPress={() => router.push(`/journal/${g.rideKey}`)} />
          ))}
        </ListCard>
      ) : <EmptyState icon={BookOpen} title="No journal entries yet" body="Open a ride and add a note, a voice note or a photo. You can also add them while you ride." />}
    </Screen>
  );
}
