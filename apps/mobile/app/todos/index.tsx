import { useRouter } from 'expo-router';
import { ClipboardList, Plus } from 'lucide-react-native';
import { TodoRow } from '@/features/TodoRow';
import { dueInfo } from '@/lib/todos';
import { totalKm, useRides } from '@/store/rides';
import { useTodos } from '@/store/todos';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { IconButton } from '@/ui/IconButton';
import { ListCard } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function Todos() {
  const router = useRouter();
  const { todos, remove, toggle, markServiceDone } = useTodos();
  const appKm = totalKm(useRides((s) => s.rides));
  const rows = todos.map((t) => ({ t, d: dueInfo(t, appKm) })).sort((a, b) => a.d.sortKey - b.d.sortKey);
  const attention = rows.filter(({ d }) => d.state === 'overdue' || d.state === 'soon');
  const later = rows.filter(({ d }) => d.state === 'ok');
  const done = rows.filter(({ d }) => d.state === 'done');
  const list = (items: typeof rows) => (
    <ListCard>
      {items.map(({ t }) => <TodoRow key={t.id} todo={t} appKm={appKm} onToggle={() => toggle(t.id)} onRemove={() => remove(t.id)} onServiceDone={() => markServiceDone(t.id, appKm)} />)}
    </ListCard>
  );
  return (
    <Screen footer={<Button icon={Plus} label="Add a to-do" onPress={() => router.push('/todos/new')} />}>
      <BackHeader title="You" right={<IconButton icon={Plus} label="Add a to-do" onPress={() => router.push('/todos/new')} />} />
      <PageTitle>To-do list</PageTitle>
      {rows.length === 0 ? <EmptyState icon={ClipboardList} title="Nothing here" body="Add your PUC, insurance, or a chain lube reminder." /> : null}
      {attention.length ? <><SectionTitle>Needs attention</SectionTitle>{list(attention)}</> : null}
      {later.length ? <><SectionTitle>Later</SectionTitle>{list(later)}</> : null}
      {done.length ? <><SectionTitle>Done</SectionTitle>{list(done)}</> : null}
      <Text variant="caption" tone="muted" style={{ marginTop: 24 }}>
        Kilometre limits only count rides recorded in Myto Moto. Rides made without the app are not counted, so the date limit is the safer one. Tap the circular arrow when you have done the job to restart the count.
      </Text>
    </Screen>
  );
}
