import { View } from 'react-native';
import { MARKS } from '@/lib/marks';
import { useMarks } from '@/store/marks';
import { formatDate } from '@/lib/dates';
import { space } from '@/theme/tokens';
import { Card } from '@/ui/Card';
import { BackHeader, PageTitle } from '@/ui/Header';
import { Reveal } from '@/ui/motion';
import { Screen } from '@/ui/Screen';
import { Stamp } from '@/ui/Stamp';
import { Text } from '@/ui/Text';

/** Every mark, earned or not. Earned ones are stamped with the day they were noticed; the rest say, in one line, what earns them. */
export default function Marks() {
  const held = useMarks((s) => s.held);
  const earned = MARKS.filter((m) => held[m.id]).length;
  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle sub="First times and running totals. Nothing here is about speed.">Marks</PageTitle>
      <Text variant="label" tone="muted" style={{ marginBottom: space[4] }}>{earned} of {MARKS.length} earned</Text>
      <View style={{ gap: space[3] }}>
        {MARKS.map((m, i) => {
          const at = held[m.id];
          return (
            <Reveal key={m.id} delay={i * 40}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
                <Stamp def={m} earned={!!at} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" tone={at ? 'ink' : 'muted'}>{m.title}</Text>
                  <Text variant="label" tone="muted">{at ? formatDate(new Date(at).toISOString().slice(0, 10)) : m.hint}</Text>
                </View>
              </Card>
            </Reveal>
          );
        })}
      </View>
    </Screen>
  );
}
