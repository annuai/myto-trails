import { useEffect } from 'react';
import { Animated, Image, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { InkFill } from '@/ui/InkFill';
import { AlertTriangle } from 'lucide-react-native';
import type { FixitDifficulty as Difficulty, FixitGuide as Guide } from '@moto-trails/domain';
import { useFixitContent } from '@/fixit/content';
import { useArtUri } from '@/fixit/artCache';
import { motion, radius, space } from '@/theme/tokens';
import { Badge } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { StatusChip, type Status } from '@/ui/Chip';
import { Icon } from '@/ui/Icon';
import { ARRIVE, useReducedMotion } from '@/ui/motion';
import { useAnimatedValue } from '@/ui/useAnimatedValue';
import { Text } from '@/ui/Text';
import { fixit } from './fixit.tokens';

const TONE: Record<Difficulty, Status> = { easy: 'good', moderate: 'caution', hard: 'stop' };
const WORD: Record<Difficulty, string> = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };
export const difficultyWord = (d: Difficulty) => WORD[d];

/** A guide's picture, when one has been drawn. With none, nothing is drawn: the words carry the guide. */
export function StepArt({ id }: { id?: string; /** Kept for callers that pass a caption; the picture's own description is used. */ label?: string }) {
  const art = useArtUri(useFixitContent(), id);
  if (!art) return null;
  return <Image source={{ uri: art.uri }} resizeMode="cover" accessibilityIgnoresInvertColors accessibilityLabel={art.alt} style={{ width: '100%', maxHeight: fixit.artMaxHeight, aspectRatio: fixit.artRatio, borderRadius: radius.card }} />;
}

/** How hard it is and how long it takes, in words. A guide a mechanic has checked says so; one that has not says nothing. */
export function GuideFacts({ guide }: { guide: Guide }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
      <StatusChip status={TONE[guide.difficulty]} label={WORD[guide.difficulty]} />
      <Badge label={`${guide.minutes} min`} />
      {guide.review ? <Badge label={`Checked by ${guide.review.by}`} /> : null}
    </View>
  );
}

/** When this is not yours to fix. Shown before the steps, never behind a tap. */
export function StopCard({ items }: { items: string[] }) {
  return (
    <Card style={{ gap: space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Icon icon={AlertTriangle} size={20} tone="stop" />
        <Text variant="bodyMedium" tone="stop">Stop and get help if</Text>
      </View>
      {items.map((t) => <Text key={t} variant="label">{t}</Text>)}
    </Card>
  );
}

/** How far through a repair the rider is: a thin bar that fills, with "Step 3 of 14" beside it. One bar reads better than fourteen dots. */
export function StepProgress({ index, count }: { index: number; count: number }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const share = useAnimatedValue((index + 1) / count);
  useEffect(() => {
    const to = (index + 1) / count;
    if (reduced) { share.setValue(to); return; }
    Animated.timing(share, { toValue: to, duration: motion.duration.base, easing: ARRIVE, useNativeDriver: false }).start();
  }, [index, count, reduced, share]);
  return (
    <View accessible accessibilityLabel={`Step ${index + 1} of ${count}`} style={{ gap: space[2] }}>
      <View style={{ height: space[1], borderRadius: radius.chip, backgroundColor: c.line, overflow: 'hidden' }}>
        <Animated.View style={{ height: space[1], width: share.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }}>
          <InkFill style={{ height: space[1], width: '100%', borderRadius: radius.chip }} />
        </Animated.View>
      </View>
      <Text variant="label" tone="muted">Step {index + 1} of {count}</Text>
    </View>
  );
}
