import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { guidesForCheck } from '@moto-trails/domain';
import { useFixitContent } from '@/fixit/content';
import { Unavailable } from '@/features/fixit/Unavailable';
import { nowMs } from '@/lib/clock';
import { useFixit } from '@/store/fixit';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ChoiceChip, StatusChip } from '@/ui/Chip';
import { BackHeader, PageTitle } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { TextButton } from '@/ui/TextButton';
import { Text } from '@/ui/Text';

type Answer = 'ok' | 'fix';

/** The two-minute walk-round before a ride: eight things, each marked fine or needs fixing. A thing that needs fixing links to its guide. */
export default function PreRideCheck() {
  const router = useRouter();
  const content = useFixitContent();
  const CHECK_ITEMS = content?.checks ?? [];
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [done, setDone] = useState(false);
  const flagged = CHECK_ITEMS.filter((i) => answers[i.id] === 'fix');
  const complete = CHECK_ITEMS.every((i) => answers[i.id]);
  const finish = () => { useFixit.getState().saveCheck(flagged.map((i) => i.id), nowMs()); setDone(true); };

  if (!content) return <Screen><BackHeader title="Fix it" /><Unavailable /></Screen>;
  if (done) {
    return (
      <Screen footer={<Button label={flagged.length ? 'Done' : 'Ride safe'} onPress={() => router.back()} />}>
        <BackHeader title="Fix it" />
        <PageTitle sub={flagged.length ? 'Sort these before you ride.' : 'Nothing to fix.'}>{flagged.length ? `${flagged.length} to fix` : 'All clear'}</PageTitle>
        <View style={{ gap: space[3] }}>
          {flagged.map((i) => (
            <Card key={i.id} style={{ gap: space[2] }}>
              <Text variant="bodyMedium">{i.label}</Text>
              {guidesForCheck(content!, i).map((g) => <Button key={g.id} variant="soft" label={g.title} arrow onPress={() => router.push(`/fixit/${g.id}`)} />)}
              {i.route ? <Button variant="soft" label="Open Documents" arrow onPress={() => router.push(i.route as '/documents')} /> : null}
              {!i.route && !i.guides.length ? <Text variant="label" tone="muted">Tighten or replace it before you ride, or have a workshop look.</Text> : null}
            </Card>
          ))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen footer={<Button label={complete ? 'Finish check' : `${CHECK_ITEMS.filter((i) => answers[i.id]).length} of ${CHECK_ITEMS.length} checked`} icon={Check} disabled={!complete} onPress={finish} />}>
      <BackHeader title="Fix it" />
      <PageTitle sub="Walk round the bike. About two minutes.">Pre-ride check</PageTitle>
      <View style={{ gap: space[6] }}>
        {CHECK_ITEMS.map((i) => (
          <View key={i.id} style={{ gap: space[2] }}>
            <Text variant="bodyMedium">{i.label}</Text>
            <Text variant="label" tone="muted">{i.how}</Text>
            <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}>
              <ChoiceChip label="Fine" selected={answers[i.id] === 'ok'} onPress={() => setAnswers((a) => ({ ...a, [i.id]: 'ok' }))} />
              <ChoiceChip label="Needs fixing" selected={answers[i.id] === 'fix'} onPress={() => setAnswers((a) => ({ ...a, [i.id]: 'fix' }))} />
              {answers[i.id] === 'fix' ? <StatusChip status="caution" label="Fix before riding" /> : null}
            </View>
          </View>
        ))}
        <TextButton label="Skip the check" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
