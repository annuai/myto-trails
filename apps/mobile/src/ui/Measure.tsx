import { View } from 'react-native';
import { space, type Tone, type TypeVariant } from '@/theme/tokens';
import { spoken, type Quantity } from '@/lib/units';
import { Text } from './Text';

/** The unit is one step smaller than the number, so a big figure does not carry a big unit. */
const UNIT_STYLE: Record<'data' | 'dataLarge' | 'liveSecondary' | 'liveCompact' | 'live', TypeVariant> = {
  data: 'data', dataLarge: 'label', liveSecondary: 'bodyMedium', liveCompact: 'bodyMedium', live: 'section',
};

type Props = {
  /** One quantity, or several that read together ("1 h" "5 min"). */
  parts: Quantity | Quantity[];
  size?: keyof typeof UNIT_STYLE;
  tone?: Tone;
  /** Overrides `tone` when the figure sits on a coloured surface. */
  color?: string;
};

/**
 * A number with its unit: the number in the data font, the unit smaller and muted, on one baseline with a token-sized
 * gap. This is the only place that decides how a measurement looks, so Dash, trails, rides and stories all match.
 */
export function Measure({ parts, size = 'dataLarge', tone = 'ink', color }: Props) {
  const list = Array.isArray(parts) ? parts : [parts];
  return (
    <View accessible accessibilityLabel={spoken(list)} style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: space[2] }}>
      {list.map((q, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'baseline', columnGap: space.half }}>
          <Text variant={size} tone={tone} style={color ? { color } : undefined}>{q.value}</Text>
          <Text variant={UNIT_STYLE[size]} tone="muted" style={color ? { color } : undefined}>{q.unit}</Text>
        </View>
      ))}
    </View>
  );
}
