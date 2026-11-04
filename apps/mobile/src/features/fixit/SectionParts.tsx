import { Image, View } from 'react-native';
import { Wrench } from 'lucide-react-native';
import type { FixitContent, FixitGuide } from '@moto-trails/domain';
import { useArtUri } from '@/fixit/artCache';
import { useTheme } from '@/theme/ThemeProvider';
import { space, size } from '@/theme/tokens';
import { accordion } from '@/ui/Accordion.tokens';
import { Icon } from '@/ui/Icon';
import { ScalePressable } from '@/ui/motion';
import { Text } from '@/ui/Text';
import { difficultyWord } from './parts';

/** The picture at the head of a section: the section's cover when it has been drawn, else a plain tile with a spanner. */
export function SectionCover({ content, art }: { content: FixitContent; art: string | null }) {
  const { c } = useTheme();
  const pic = useArtUri(content, art ?? undefined);
  return (
    <View style={{ width: accordion.lead, height: accordion.lead, borderRadius: accordion.leadRadius, overflow: 'hidden', backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' }}>
      {pic ? <Image source={{ uri: pic.uri }} resizeMode="cover" accessibilityIgnoresInvertColors accessibilityElementsHidden style={{ width: accordion.lead, height: accordion.lead }} /> : <Icon icon={Wrench} size={24} tone="muted" />}
    </View>
  );
}

const TONE = { easy: 'good', moderate: 'caution', hard: 'stop' } as const;

/** One guide inside an open section: its name, then how hard and how long, with a hairline above. */
export function GuideRow({ guide, onPress }: { guide: FixitGuide; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <ScalePressable accessibilityRole="button" accessibilityLabel={`${guide.title}, ${difficultyWord(guide.difficulty)}, ${guide.minutes} minutes`} scaleTo={0.99} onPress={onPress}>
      <View style={{ minHeight: size.row, justifyContent: 'center', gap: space.half, paddingVertical: space[3], paddingHorizontal: space[5], borderTopWidth: 1, borderTopColor: c.line }}>
        <Text variant="body">{guide.title}</Text>
        <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'baseline' }}>
          <Text variant="label" tone={TONE[guide.difficulty]}>{difficultyWord(guide.difficulty)}</Text>
          <Text variant="data" tone="muted">{guide.minutes} min</Text>
        </View>
      </View>
    </ScalePressable>
  );
}
