import { useState } from 'react';
import { View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { clockLabel } from '@/lib/community';
import { size, space } from '@/theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';
import { TimeWheel } from './TimeWheel';
import { ScalePressable } from './motion';

/**
 * A time as one line: the label, and the time on the right. Tap it and a wheel opens right under it; scroll to the time. Tap again to
 * fold it away. It opens in place rather than in a second sheet, so it works inside a sheet and nothing covers the form.
 */
export function TimeField({ label, value, onChange }: { label: string; value: number; onChange: (minutes: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: space[2] }}>
      <ScalePressable scaleTo={0.99} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${label}, ${clockLabel(value)}. ${open ? 'Close' : 'Change'}`} onPress={() => setOpen(!open)}
        style={{ minHeight: size.target, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] }}>
        <Text variant="labelMedium" style={{ flexShrink: 1 }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          <Text variant="dataLarge">{clockLabel(value)}</Text>
          <Icon icon={open ? ChevronUp : ChevronDown} size={20} tone="muted" />
        </View>
      </ScalePressable>
      {open ? <TimeWheel label={label} value={value} onChange={onChange} /> : null}
    </View>
  );
}
