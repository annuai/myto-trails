import { useRouter } from 'expo-router';
import { BookOpen, Plus } from 'lucide-react-native';
import { groupByRide, summarise } from '@/lib/journalEntries';
import { journalDate, journalTitle } from '@/lib/journalTitle';
import { useJournal } from '@/store/journal';
import { useRides } from '@/store/rides';
import { EmptyState } from '@/ui/EmptyState';
import { Button } from '@/ui/Button';
import { BackHeader, PageTitle } from '@/ui/Header';
import { IconButton } from '@/ui/IconButton';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';

/** Every journal, most recently written first. A journal can belong to a ride or stand on its own. */
export default function Journals() {
  const router = useRouter();
  const entries = useJournal((s) => s.entries);
  const rides = useRides((s) => s.rides);
  const titles = useJournal((s) => s.titles);
  const start = () => router.push(`/journal/${Date.now()}`);
  const groups = groupByRide(entries);
  return (
    <Screen footer={<Button icon={Plus} label="Start a journal" onPress={start} />}>
      <BackHeader title="You" right={<IconButton icon={Plus} label="Start a journal" onPress={start} />} />
      <PageTitle sub="Notes, voice and photos, on a ride or on their own. They stay on this phone.">Journal</PageTitle>
      {groups.length ? (
        <ListCard>
          {groups.map((g) => (
            <Row key={g.rideKey} icon={BookOpen} label={journalTitle(g.rideKey, rides, titles)} sub={`${journalDate(g.rideKey)} · ${summarise(g.entries)}`} onPress={() => router.push(`/journal/${g.rideKey}`)} />
          ))}
        </ListCard>
      ) : <EmptyState icon={BookOpen} title="No journal entries yet" body="Start a journal and add a note, a voice note or a photo. You can also add them to a ride while you ride." />}
    </Screen>
  );
}
