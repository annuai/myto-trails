import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useRecorder } from '@/store/recorder';
import { dueInfo } from '@/lib/todos';
import { daysUntil } from '@/lib/dates';
import { useProfile } from '@/store/profile';
import { totalKm, useRides } from '@/store/rides';
import { useTodos } from '@/store/todos';
import { useTrailStore } from '@/store/trails';
import { Button } from '@/ui/Button';
import { ChoiceChip, StatusChip, type Status } from '@/ui/Chip';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

type Check = { label: string; status: Status; word: string; go?: string };

function validity(label: string, iso: string | undefined, go: string): Check {
  if (!iso) return { label, status: 'unknown', word: 'Not added', go };
  const d = daysUntil(iso);
  return d < 0 ? { label, status: 'stop', word: 'Expired', go } : d <= 30 ? { label, status: 'caution', word: `Expires in ${d} days`, go } : { label, status: 'good', word: 'Valid', go };
}

/** Record, ready: what we can truly check before a ride, then one big Start. */
export default function RideReady() {
  const router = useRouter();
  const running = useRecorder((s) => s.status === 'running');
  const [source, setSource] = useState<'gps' | 'sim'>('gps');
  const { licence, vehicle, contacts } = useProfile();
  const rides = useRides((s) => s.rides);
  const { offline, nextTrip } = useTrailStore();
  const todos = useTodos((s) => s.todos);
  const overdue = todos.filter((t) => dueInfo(t, totalKm(rides)).state === 'overdue').length;
  const trail = nextTrip;

  const checks: Check[] = [
    validity('Driving licence', licence?.validTill, '/documents/licence'),
    validity('Insurance', vehicle?.insuranceValidTill, '/documents/vehicle'),
    validity('PUC', vehicle?.pucValidTill, '/documents/vehicle'),
    contacts.length ? { label: 'Emergency contact', status: 'good', word: 'Set', go: '/documents/contacts' } : { label: 'Emergency contact', status: 'caution', word: 'Add one', go: '/documents/contacts' },
    overdue ? { label: 'To-dos', status: 'caution', word: `${overdue} overdue`, go: '/todos' } : { label: 'To-dos', status: 'good', word: 'Up to date' },
  ];
  if (trail) checks.push(offline[trail.slug] ? { label: `Offline pack: ${trail.name}`, status: 'good', word: 'Ready' } : { label: `Offline pack: ${trail.name}`, status: 'caution', word: 'Not downloaded', go: `/trail/${trail.slug}` });

  const start = () => { if (!running) useRecorder.getState().start(source); router.replace('/ride/live'); };

  return (
    <Screen footer={<Button big variant="accent" label={running ? 'Back to your ride' : 'Start ride'} onPress={start} />}>
      <BackHeader />
      <PageTitle sub="These checks never stop you from starting.">Ready to ride?</PageTitle>
      <ListCard>
        {checks.map((c) => <Row key={c.label} label={c.label} right={<StatusChip status={c.status} label={c.word} />} onPress={c.go ? () => router.push(c.go as never) : undefined} chevron={false} />)}
      </ListCard>
      <SectionTitle>Location</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <ChoiceChip label="Phone GPS" selected={source === 'gps'} onPress={() => setSource('gps')} />
        <ChoiceChip label="Simulated (testing)" selected={source === 'sim'} onPress={() => setSource('sim')} />
      </View>
      <Text variant="caption" tone="muted" style={{ marginTop: 12 }}>
        {source === 'sim' ? 'Moves along a test loop so you can try recording on a laptop. Not a real ride.' : 'Uses this device’s GPS. The browser will ask for permission.'}
      </Text>
    </Screen>
  );
}
