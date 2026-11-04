import { View } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Backpack, ClipboardCheck, Wrench } from 'lucide-react-native';
import { fixitCheckStatus, fixitSections } from '@moto-trails/domain';
import { refreshFixit, useFixitContent } from '@/fixit/content';
import { Unavailable } from '@/features/fixit/Unavailable';
import { CarryList, GuideRow, SectionCover } from '@/features/fixit/SectionParts';
import { nextOpen } from '@/lib/accordion';
import { AccordionItem } from '@/ui/Accordion';
import { nowMs } from '@/lib/clock';
import { difficultyWord } from '@/features/fixit/parts';
import { totalFixed, useFixit } from '@/store/fixit';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** Short repair guides for the roadside. Everything is on the phone, so it works with no signal. */
export default function FixIt() {
  const router = useRouter();
  const last = useFixit((s) => s.last);
  const fixed = useFixit((s) => totalFixed(s.fixed));
  const content = useFixitContent();
  const [openId, setOpenId] = useState<string | null>(null);
  // The guides are edited on the site: ask for the latest when this opens. Offline, the copy on the phone is used.
  useEffect(() => { void refreshFixit(nowMs()); }, []);
  const status = fixitCheckStatus(last, nowMs());
  const checkNote = status === 'clear' ? 'Checked today. All clear.' : status === 'flagged' ? `Checked today. ${last?.flagged.length} to fix before you ride.` : undefined;
  const groups = content ? fixitSections(content) : [];
  if (!content) return <Screen><BackHeader title="You" /><PageTitle sub="Short guides for the roadside.">Fix it</PageTitle><Unavailable /></Screen>;
  return (
    <Screen>
      <BackHeader title="You" />
      <PageTitle sub="Short guides for the roadside. They work with no signal.">Fix it</PageTitle>
      <View style={{ gap: space[2] }}>
        <Button icon={ClipboardCheck} label="Pre-ride check · 2 min" arrow onPress={() => router.push('/fixit/check')} />
        {checkNote ? <Text variant="label" tone="muted">{checkNote}</Text> : null}
      </View>
      <SectionTitle>Something has gone wrong</SectionTitle>
      {groups.length ? (
        <View style={{ gap: space[3] }}>
          {groups.map((g) => (
            <AccordionItem
              key={g.section.id}
              title={g.section.title}
              subtitle={`${g.guides.length} ${g.guides.length === 1 ? 'guide' : 'guides'}`}
              leading={<SectionCover content={content} art={g.section.cover} />}
              open={openId === g.section.id}
              onToggle={() => setOpenId(nextOpen(openId, g.section.id))}
            >
              {g.guides.map((guide) => <GuideRow key={guide.id} guide={guide} onPress={() => router.push(`/fixit/${guide.id}`)} />)}
            </AccordionItem>
          ))}
        </View>
      ) : (
        <ListCard>
          {content.guides.map((g) => <Row key={g.id} icon={Wrench} label={g.title} sub={`${difficultyWord(g.difficulty)} · ${g.minutes} min`} onPress={() => router.push(`/fixit/${g.id}`)} />)}
        </ListCard>
      )}
      <View style={{ marginTop: space[3] }}>
        <AccordionItem
          title="What to carry"
          subtitle="Tools for every ride"
          leading={<SectionCover content={content} art={null} icon={Backpack} />}
          open={openId === 'carry'}
          onToggle={() => setOpenId(nextOpen(openId, 'carry'))}
        >
          <CarryList content={content} />
        </AccordionItem>
      </View>
      <Text variant="caption" tone="muted" style={{ marginTop: space[5] }}>
        General advice only. Your bike’s manual has the exact numbers.{fixed ? ` You have fixed ${fixed} thing${fixed === 1 ? '' : 's'} yourself.` : ''}
      </Text>
    </Screen>
  );
}
