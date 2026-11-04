import { View } from 'react-native';
import { kitFor } from '@moto-trails/domain';
import { useFixitContent } from '@/fixit/content';
import { Unavailable } from '@/features/fixit/Unavailable';
import { useFixit } from '@/store/fixit';
import { space } from '@/theme/tokens';
import { Checkbox } from '@/ui/Checkbox';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** What to carry. Tick what is in your bag; it stays ticked. */
export default function Toolkit() {
  const packed = useFixit((s) => s.packed);
  const toggle = useFixit((s) => s.togglePacked);
  const content = useFixitContent();
  const base = content ? kitFor(content, false) : [];
  const remote = content ? kitFor(content, true).filter((t) => t.kit === 'remote') : [];
  if (!content) return <Screen><BackHeader title="Fix it" /><Unavailable /></Screen>;
  const list = (tools: typeof base) => (
    <ListCard>
      {tools.map((t) => (
        <Row key={t.id} label={t.name} sub={t.why} chevron={false} onPress={() => toggle(t.id)} right={<Checkbox checked={!!packed[t.id]} onChange={() => toggle(t.id)} label={`${t.name}, in my kit`} />} />
      ))}
    </ListCard>
  );
  return (
    <Screen>
      <BackHeader title="Fix it" />
      <PageTitle sub={`${base.filter((t) => packed[t.id]).length} of ${base.length} for every ride are in your bag.`}>Toolkit</PageTitle>
      <SectionTitle first>Every ride</SectionTitle>
      {list(base)}
      <SectionTitle>Far from a workshop</SectionTitle>
      <View style={{ marginBottom: space[3] }}><Text variant="label" tone="muted">Add these when there is no signal, no fuel nearby, or the nearest workshop is hours away.</Text></View>
      {list(remote)}
    </Screen>
  );
}
