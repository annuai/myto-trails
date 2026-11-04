import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, Check, Eye, IdCard, type LucideIcon } from 'lucide-react-native';
import { guidesForCheck, type FixitCheckItem, type FixitContent } from '@moto-trails/domain';
import { useFixitContent } from '@/fixit/content';
import { Unavailable } from '@/features/fixit/Unavailable';
import { SectionCover } from '@/features/fixit/SectionParts';
import { nextOpen } from '@/lib/accordion';
import { nowMs } from '@/lib/clock';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { AccordionItem } from '@/ui/Accordion';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ChoiceChip } from '@/ui/Chip';
import { BackHeader, PageTitle } from '@/ui/Header';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { useFixit } from '@/store/fixit';

type Answer = 'ok' | 'fix';
/** Items that are not a repair have no guide to borrow a picture from: they get an icon tile. */
const ICON: Record<string, LucideIcon> = { walk: Eye, papers: IdCard };

/** The picture of the section the item's first guide sits in, so the tyre check shows the tyre picture. */
function coverOf(content: FixitContent, item: FixitCheckItem): string | null {
  const guide = guidesForCheck(content, item)[0];
  return content.sections?.find((s) => s.id === guide?.section)?.cover ?? null;
}

/**
 * The walk-round before a ride: eight cards, one open at a time. Mark each Fine or Needs fixing; it closes with a tick or a warning and the next
 * one opens. A thing that needs fixing links to its guide on the last page.
 */
export default function PreRideCheck() {
  const router = useRouter();
  const { c } = useTheme();
  const content = useFixitContent();
  const items = content?.checks ?? [];
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const [done, setDone] = useState(false);
  const flagged = items.filter((i) => answers[i.id] === 'fix');
  const answered = items.filter((i) => answers[i.id]).length;
  const complete = items.length > 0 && answered === items.length;
  const finish = () => { useFixit.getState().saveCheck(flagged.map((i) => i.id), nowMs()); setDone(true); };
  const answer = (id: string, a: Answer) => {
    const next = { ...answers, [id]: a };
    setAnswers(next);
    setOpenId(items.find((i) => !next[i.id])?.id ?? null);
  };

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
              {guidesForCheck(content, i).map((g) => <Button key={g.id} variant="soft" label={g.title} arrow onPress={() => router.push(`/fixit/${g.id}`)} />)}
              {i.route ? <Button variant="soft" label="Open Documents" arrow onPress={() => router.push(i.route as '/documents')} /> : null}
              {!i.route && !i.guides.length ? <Text variant="label" tone="muted">Tighten or replace it before you ride, or have a workshop look.</Text> : null}
            </Card>
          ))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen footer={<Button label={complete ? 'Finish check' : `${answered} of ${items.length} checked`} icon={Check} disabled={!complete} onPress={finish} />}>
      <BackHeader title="Fix it" />
      <PageTitle sub="Walk round the bike. About two minutes.">Pre-ride check</PageTitle>
      <View style={{ gap: space[3] }}>
        {items.map((i) => {
          const a = answers[i.id];
          return (
            <AccordionItem
              key={i.id}
              title={i.label}
              subtitle={a === 'ok' ? 'Fine' : a === 'fix' ? 'Needs fixing' : undefined}
              leading={<SectionCover content={content} art={coverOf(content, i)} icon={ICON[i.id]} />}
              trailing={a ? <View accessibilityElementsHidden><Icon icon={a === 'ok' ? Check : AlertTriangle} size={22} tone={a === 'ok' ? 'good' : 'caution'} /></View> : undefined}
              open={openId === i.id}
              onToggle={() => setOpenId(nextOpen(openId, i.id))}
            >
              <View style={{ gap: space[4], paddingHorizontal: space[5], paddingVertical: space[4], borderTopWidth: 1, borderTopColor: c.line }}>
                <Text variant="label" tone="muted">{i.how}</Text>
                <View style={{ flexDirection: 'row', gap: space[2] }}>
                  <ChoiceChip raised label="Needs fixing" selected={a === 'fix'} onPress={() => answer(i.id, 'fix')} />
                  <ChoiceChip raised label="Fine" selected={a === 'ok'} onPress={() => answer(i.id, 'ok')} />
                </View>
              </View>
            </AccordionItem>
          );
        })}
      </View>
    </Screen>
  );
}
