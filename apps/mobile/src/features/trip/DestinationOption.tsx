import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Circle, CircleDot } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';
import { Icon } from '@/ui/Icon';
import { ScalePressable } from '@/ui/motion';
import { Text } from '@/ui/Text';

/** One answer to "Where are you going?": a card the rider taps to choose. The chosen one has a dark outline and a filled dot. */
export function DestinationOption({ title, sub, selected, onSelect, children }: { title: string; sub?: string; selected: boolean; onSelect: () => void; children?: ReactNode }) {
  const { c } = useTheme();
  return (
    <ScalePressable scaleTo={0.985} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={sub ? `${title}. ${sub}` : title} onPress={onSelect}
      style={{ backgroundColor: c.card, borderRadius: radius.card, padding: space[4], gap: space[3], borderWidth: size.rule, borderColor: selected ? c.ink : 'transparent' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <Icon icon={selected ? CircleDot : Circle} size={24} tone={selected ? 'ink' : 'muted'} />
        <View style={{ flex: 1, gap: space[1] }}>
          <Text variant="bodyMedium">{title}</Text>
          {sub ? <Text variant="label" tone="muted">{sub}</Text> : null}
        </View>
      </View>
      {children}
    </ScalePressable>
  );
}
