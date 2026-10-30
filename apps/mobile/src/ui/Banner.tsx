import { View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Theme } from '@/theme/ThemeProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { fixed, radius, space, size } from '@/theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';
import { ScalePressable } from './motion';
import { banner } from './Banner.tokens';

/** Dark card for something that needs action (stale pack, missing document). Always dark for contrast. */
export function Banner({ eyebrow, title, onPress }: { eyebrow: string; title: string; onPress?: () => void }) {
  return (
    <Theme mode="dark">
      <BannerBody eyebrow={eyebrow} title={title} onPress={onPress} />
    </Theme>
  );
}

function BannerBody({ eyebrow, title, onPress }: { eyebrow: string; title: string; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <ScalePressable scaleTo={0.98} accessibilityRole="button" onPress={onPress} style={{ backgroundColor: fixed.ink, borderRadius: radius.card, padding: space[5], flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
      <View style={{ flex: 1, gap: space[2] }}>
        <Text variant="label" tone="muted">{eyebrow}</Text>
        <Text variant="bodyMedium">{title}</Text>
      </View>
      <View style={{ width: size.compact, height: size.compact, borderRadius: banner.iconRadius, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' }}>
        <Icon icon={AlertTriangle} size={22} tone="caution" />
      </View>
    </ScalePressable>
  );
}
