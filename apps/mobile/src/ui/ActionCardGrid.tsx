import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';
import { ScalePressable } from './motion';
import { actionCard } from './ActionCardGrid.tokens';

export type ActionCardItem = { key: 'clay' | 'sage' | 'sand' | 'sky'; icon: LucideIcon; title: string; detail: string; onPress: () => void };

/**
 * Four cards in two rows of two. Each is a colour of its own (`cardTint`, so it is the same card in the same colour every time),
 * with the icon top left and the title and what is true right now at the bottom. Four, never more: this is a shortcut, not a menu.
 */
export function ActionCardGrid({ items }: { items: ActionCardItem[] }) {
  const { c } = useTheme();
  const rows = [items.slice(0, 2), items.slice(2, 4)];
  return (
    <View style={{ gap: space[3] }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space[3] }}>
          {row.map((it) => (
            <ScalePressable key={it.key} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={`${it.title}. ${it.detail}`} onPress={it.onPress}
              style={{ flex: 1, minHeight: actionCard.minHeight, borderRadius: radius.card, padding: space[4], justifyContent: 'space-between', backgroundColor: c.cardTint[it.key] }}>
              <Icon icon={it.icon} size={actionCard.icon} />
              <View style={{ gap: space.half }}>
                <Text variant="bodyMedium" numberOfLines={1}>{it.title}</Text>
                {/* tabLabel, not muted: it is the grey that reads on every one of the four tints. */}
                <Text variant="caption" numberOfLines={2} style={{ color: c.tabLabel, minHeight: actionCard.detailHeight }}>{it.detail}</Text>
              </View>
            </ScalePressable>
          ))}
        </View>
      ))}
    </View>
  );
}
