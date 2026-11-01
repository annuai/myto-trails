import { useState } from 'react';
import { View } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, size } from '@/theme/tokens';
import { formatDate } from '@/lib/dates';
import { DateDialog } from './DateDialog';
import { Icon } from './Icon';
import { Text } from './Text';
import { TextButton } from './TextButton';
import { ScalePressable } from './motion';

/**
 * A field that shows a date; tapping it opens the date dialog (three wheels, Cancel and OK). `value` and `onChange` are 'YYYY-MM-DD';
 * an empty value shows `placeholder`. `title` is the dialog's heading. With `clearable` a set date can be removed: `onChange('')`.
 * `min` and `max` bound the dialog.
 */
export function DateField({ label, value, onChange, title, min, max, hint, placeholder = 'Pick a date', clearable }: { label: string; value?: string; onChange: (iso: string) => void; title?: string; min?: string; max?: string; hint?: string; placeholder?: string; clearable?: boolean }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: space[2] }}>
      <Text variant="labelMedium">{label}</Text>
      <ScalePressable scaleTo={0.99} accessibilityRole="button" accessibilityLabel={`${label}: ${value ? formatDate(value) : 'not set'}`} accessibilityHint="Opens the date chooser" onPress={() => setOpen(true)}
        style={{ minHeight: size.button, borderRadius: radius.control, paddingHorizontal: space[5], backgroundColor: c.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="body" tone={value ? 'ink' : 'muted'}>{value ? formatDate(value) : placeholder}</Text>
        <Icon icon={Calendar} size={20} tone="muted" />
      </ScalePressable>
      {hint ? <Text variant="caption" tone="muted">{hint}</Text> : null}
      {clearable && value ? <View style={{ alignItems: 'flex-start' }}><TextButton label="Clear date" onPress={() => onChange('')} /></View> : null}
      <DateDialog open={open} title={title ?? 'Choose date'} value={value} min={min} max={max} onCancel={() => setOpen(false)} onConfirm={(iso) => { onChange(iso); setOpen(false); }} />
    </View>
  );
}
