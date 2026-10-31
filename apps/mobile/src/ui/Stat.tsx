import { View } from 'react-native';
import type { Quantity } from '@/lib/units';
import { Measure } from './Measure';
import { Text } from './Text';

import { space } from '@/theme/tokens';
/** A figure with a label under it. Pass `parts` for a measurement (number and unit), `value` for a plain count. */
export function Stat({ value, parts, label, large }: { value?: string; parts?: Quantity | Quantity[]; label: string; large?: boolean }) {
  return (
    <View style={{ flex: 1, gap: space.half }}>
      {parts ? <Measure parts={parts} size={large ? 'liveSecondary' : 'dataLarge'} /> : <Text variant={large ? 'liveSecondary' : 'dataLarge'}>{value}</Text>}
      <Text variant="label" tone="muted">{label}</Text>
    </View>
  );
}
