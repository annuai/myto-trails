import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { badge } from './Badge.tokens';
import { Text } from './Text';

/** A small pill with a short fact in it. `solid` is the main fact, `soft` a supporting one. */
export function Badge({ label, tone = 'soft' }: { label: string; tone?: 'solid' | 'soft' }) {
  const { c } = useTheme();
  const solid = tone === 'solid';
  return (
    <View style={{ alignSelf: 'flex-start', maxWidth: '100%', minHeight: badge.minHeight, paddingHorizontal: space[3], borderRadius: radius.chip, justifyContent: 'center', backgroundColor: solid ? c.ink : c.raised }}>
      <Text variant="labelMedium" tone={solid ? 'onInk' : 'ink'} numberOfLines={2}>{label}</Text>
    </View>
  );
}
