import { useRouter } from 'expo-router';
import { ClipboardList, FileText, Package, PenLine, Plus, Wrench } from 'lucide-react-native';
import { TodoRow } from '@/features/TodoRow';
import { templates } from '@/data/todoTemplates';
import { dueInfo } from '@/lib/todos';
import { totalKm, useRides } from '@/store/rides';
import { useTodos } from '@/store/todos';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { space } from '@/theme/tokens';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { IconButton } from '@/ui/IconButton';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const iconFor = { document: FileText, service: Wrench, pack: Package, other: PenLine } as const;
/** The list suggests common reminders until it has this many; it shows this many at a time. */
const QUICK_UNTIL = 5, QUICK_SHOWN = 5;

export default function Todos() {
  const router = useRouter();
  const { todos, remove, toggle, markServiceDone } = useTodos();
  const appKm = totalKm(useRides((s) => s.rides));
  const rows = todos.map((t) => ({ t, d: dueInfo(t, appKm) })).sort((a, b) => a.d.sortKey - b.d.sortKey);
  const attention = rows.filter(({ d }) => d.state === 'overdue' || d.state === 'soon');
  const later = rows.filter(({ d }) => d.state === 'ok');
  const done = rows.filter(({ d }) => d.state === 'done');
  // Common reminders not already on the list, a tap away, until the list has a few of its own.
  const have = new Set(todos.map((t) => t.title.toLowerCase()));
  const quick = todos.length < QUICK_UNTIL ? templates.filter((t) => !have.has(t.title.toLowerCase())).slice(0, QUICK_SHOWN) : [];
  const list = (items: typeof rows) => (
    <ListCard>
      {items.map(({ t }) => <TodoRow key={t.id} todo={t} appKm={appKm} onToggle={() => toggle(t.id)} onRemove={() => remove(t.id)} onServiceDone={() => markServiceDone(t.id, appKm)} />)}
    </ListCard>
  );
  return (
    <Screen footer={<Button icon={Plus} label="Add a to-do" onPress={() => router.push('/todos/new')} />}>
      <BackHeader title="You" right={<IconButton icon={Plus} label="Add a to-do" onPress={() => router.push('/todos/new')} />} />
      <PageTitle>To-do list</PageTitle>
      {rows.length === 0 ? <EmptyState icon={ClipboardList} title="Nothing to remember yet" body="Add your PUC, insurance or a chain lube reminder and we'll nudge you before it's due." action={{ label: 'Add a reminder', onPress: () => router.push('/todos/new') }} /> : null}
      {attention.length ? <><SectionTitle first>Needs attention</SectionTitle>{list(attention)}</> : null}
      {later.length ? <><SectionTitle first={!attention.length}>Later</SectionTitle>{list(later)}</> : null}
      {done.length ? <><SectionTitle first={!attention.length && !later.length}>Done</SectionTitle>{list(done)}</> : null}
      {quick.length ? (
        <>
          <SectionTitle>Quick add</SectionTitle>
          <ListCard>
            {quick.map((t) => <Row key={t.key} icon={iconFor[t.category]} label={t.title} sub={t.hint} onPress={() => router.push(`/todos/new?template=${t.key}`)} />)}
          </ListCard>
        </>
      ) : null}
      <Text variant="caption" tone="muted" style={{ marginTop: space[6] }}>
        Kilometre limits only count rides recorded in Myto Moto. Rides made without the app are not counted, so the date limit is the safer one. Tap the circular arrow when you have done the job to restart the count.
      </Text>
    </Screen>
  );
}
