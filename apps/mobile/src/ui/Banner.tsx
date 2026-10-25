import { View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Theme } from '@/theme/ThemeProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';
import { ScalePressable } from './motion';

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
    <ScalePressable scaleTo={0.98} accessibilityRole="button" onPress={onPress} style={{ backgroundColor: '#1a1a1a', borderRadius: radius.card, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text variant="label" tone="muted">{eyebrow}</Text>
        <Text variant="bodyMedium">{title}</Text>
      </View>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' }}>
        <Icon icon={AlertTriangle} size={22} tone="caution" />
      </View>
    </ScalePressable>
  );
}
