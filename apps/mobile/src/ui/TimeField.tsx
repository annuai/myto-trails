import { useState } from 'react';
import { View } from 'react-native';
import { Clock } from 'lucide-react-native';
import { clockLabel } from '@/lib/community';
import { size, space } from '@/theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';
import { TimeDialog } from './TimeWheel';
import { ScalePressable } from './motion';

/**
 * A time as one line: the label, and the time on the right. Tap it and the time dialog opens (hour, minute and AM or PM wheels,
 * Cancel and OK). `value` is minutes after midnight; `title` is the dialog's heading.
 */
export function TimeField({ label, value, onChange, title }: { label: string; value: number; onChange: (minutes: number) => void; title?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <ScalePressable scaleTo={0.99} accessibilityRole="button" accessibilityLabel={`${label}, ${clockLabel(value)}`} accessibilityHint="Opens the time chooser" onPress={() => setOpen(true)}
        style={{ minHeight: size.target, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] }}>
        <Text variant="labelMedium" style={{ flexShrink: 1 }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          <Text variant="dataLarge">{clockLabel(value)}</Text>
          <Icon icon={Clock} size={20} tone="muted" />
        </View>
      </ScalePressable>
      <TimeDialog open={open} title={title ?? 'Choose time'} value={value} onCancel={() => setOpen(false)} onConfirm={(m) => { onChange(m); setOpen(false); }} />
    </View>
  );
}
