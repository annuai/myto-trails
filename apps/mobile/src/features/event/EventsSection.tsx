import { View } from 'react-native';
import { CalendarClock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { Async } from '@/api/useApi';
import type { RideEvent } from '@/api/types';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Text } from '@/ui/Text';
import { space } from '@/theme/tokens';
import { rowValue, whenAndWhere } from './labels';

/** A titled list of events: loading, error with retry, an honest empty line, or one row each. Tapping a row opens the event. */
export function EventsSection({ title, events, empty, onAdd, addLabel, first }: { title: string; events: Async<RideEvent[]>; empty: string; onAdd?: () => void; addLabel?: string; first?: boolean }) {
  const router = useRouter();
  return (
    <>
      <SectionTitle first={first} onAdd={onAdd} addLabel={addLabel}>{title}</SectionTitle>
      {events.error && !events.data ? (
        <Card style={{ gap: space[3] }}><Text variant="label" tone="stop">{events.error}</Text><Button variant="soft" label="Try again" onPress={events.reload} /></Card>
      ) : !events.data ? <Text variant="label" tone="muted">Loading…</Text>
      : events.data.length === 0 ? <Text variant="label" tone="muted">{empty}</Text>
      : (
        <ListCard>
          {events.data.map((e) => <Row key={e.id} icon={CalendarClock} label={e.title} sub={whenAndWhere(e)} value={rowValue(e)} onPress={() => router.push(`/event/${e.id}`)} />)}
        </ListCard>
      )}
    </>
  );
}
