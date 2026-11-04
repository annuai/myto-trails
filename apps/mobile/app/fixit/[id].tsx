import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { AlertTriangle, ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import { guideById, toolsOf } from '@moto-trails/domain';
import { useFixitContent } from '@/fixit/content';
import { Unavailable } from '@/features/fixit/Unavailable';
import { GuideFacts, StepArt, StepProgress, StopCard } from '@/features/fixit/parts';
import { fixit } from '@/features/fixit/fixit.tokens';
import { useFixit } from '@/store/fixit';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { Icon } from '@/ui/Icon';
import { ListCard, Row } from '@/ui/ListCard';
import { Screen } from '@/ui/Screen';
import { TextButton } from '@/ui/TextButton';
import { Text } from '@/ui/Text';

/**
 * One repair guide. It opens as a page to read: what it takes, when to stop, then every step. "Walk me through it" opens the same steps one at a time
 * in large type, with the screen kept awake, for a rider with gloves on.
 */
export default function Guide() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const content = useFixitContent();
  const guide = content ? guideById(content, id) : undefined;
  const [walking, setWalking] = useState(false);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!walking) return;
    void activateKeepAwakeAsync('fixit').catch(() => undefined);
    return () => { void deactivateKeepAwake('fixit'); };
  }, [walking]);
  if (!content) return <Screen><BackHeader title="Fix it" /><Unavailable /></Screen>;
  if (!guide) return <Screen><BackHeader title="Fix it" /><Text>That guide was not found.</Text></Screen>;

  const fixedIt = () => { useFixit.getState().markFixed(guide.id); router.back(); };
  const last = guide.steps.length - 1;

  if (walking) {
    const step = guide.steps[i]!;
    return (
      <Screen
        scroll
        footer={(
          <View style={{ gap: space[2] }}>
            <View style={{ flexDirection: 'row', gap: space[3] }}>
              <Button variant="soft" icon={ArrowLeft} label="Back" disabled={i === 0} flex onPress={() => setI(i - 1)} />
              {i < last ? <Button big icon={ArrowRight} label="Next" flex onPress={() => setI(i + 1)} /> : <Button big icon={Check} label="It works" flex onPress={fixedIt} />}
            </View>
            {i === last ? <TextButton label="Still stuck? Call a contact" onPress={() => router.push('/documents/contacts')} /> : null}
          </View>
        )}
      >
        <BackHeader title={guide.title} right={<TextButton label="All steps" onPress={() => setWalking(false)} />} />
        <View style={{ gap: space[5] }}>
          <StepProgress index={i} count={guide.steps.length} />
          <StepArt id={step.art ?? (i === 0 ? guide.hero : undefined)} />
          <Text variant="step" accessibilityLiveRegion="polite">{step.text}</Text>
          {step.warn ? (
            <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'flex-start' }}>
              <Icon icon={AlertTriangle} size={22} tone="caution" />
              <Text variant="section" tone="caution" style={{ flex: 1 }}>{step.warn}</Text>
            </View>
          ) : null}
          {step.expect ? (
            <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'flex-start' }}>
              <Icon icon={Check} size={22} tone="good" />
              <Text variant="section" tone="good" style={{ flex: 1 }}>{step.expect}</Text>
            </View>
          ) : null}
        </View>
      </Screen>
    );
  }

  const tools = toolsOf(content, guide);
  return (
    <Screen footer={<Button big arrow label="Walk me through it" onPress={() => { setI(0); setWalking(true); }} />}>
      <BackHeader title="Fix it" />
      <PageTitle sub={guide.summary}>{guide.title}</PageTitle>
      <View style={{ gap: space[5] }}>
        <GuideFacts guide={guide} />
        <StepArt id={guide.hero} />
        <StopCard items={guide.stopIf} />
      </View>
      {tools.length ? (
        <>
          <SectionTitle>You will need</SectionTitle>
          <ListCard>
            {tools.map((t) => <Row key={t.id} label={t.name} sub={t.why} chevron={false} />)}
          </ListCard>
        </>
      ) : null}
      {guide.terms.length ? (
        <>
          <SectionTitle>Words used</SectionTitle>
          <ListCard>
            {guide.terms.map((t) => <Row key={t.term} label={t.term} sub={t.meaning} chevron={false} />)}
          </ListCard>
        </>
      ) : null}
      <SectionTitle>Steps</SectionTitle>
      <View style={{ gap: space[6] }}>
        {guide.steps.map((s, n) => (
          <View key={n} style={{ flexDirection: 'row', gap: space[4] }}>
            <View style={{ width: fixit.stepBadge, height: fixit.stepBadge, borderRadius: radius.chip, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' }}>
              <Text variant="data">{n + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: space[3] }}>
              <Text variant="body">{s.text}</Text>
              {s.warn ? (
                <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'flex-start' }}>
                  <Icon icon={AlertTriangle} size={18} tone="caution" />
                  <Text variant="label" tone="caution" style={{ flex: 1 }}>{s.warn}</Text>
                </View>
              ) : null}
              {s.expect ? (
                <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'flex-start' }}>
                  <Icon icon={Check} size={18} tone="good" />
                  <Text variant="label" tone="good" style={{ flex: 1 }}>{s.expect}</Text>
                </View>
              ) : null}
              <StepArt id={s.art} />
            </View>
          </View>
        ))}
      </View>
      <View style={{ marginTop: space[8], minHeight: size.target }}>
        <Button variant="soft" icon={Check} label="I fixed it" onPress={fixedIt} />
      </View>
    </Screen>
  );
}
