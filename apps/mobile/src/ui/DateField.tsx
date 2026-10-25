import { View } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { formatDate } from '@/lib/dates';
import { Button } from './Button';
import { DatePicker } from './DatePicker';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { Text } from './Text';
import { ScalePressable } from './motion';

/** A field that shows a date; tapping it asks the screen to open <DatePickSheet>. */
export function DateField({ label, value, onPress, hint }: { label: string; value?: string; onPress: () => void; hint?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text variant="labelMedium">{label}</Text>
      <ScalePressable scaleTo={0.99} accessibilityRole="button" accessibilityLabel={`${label}: ${value ? formatDate(value) : 'not set'}`} onPress={onPress}
        style={{ minHeight: 56, borderRadius: radius.control, paddingHorizontal: 18, backgroundColor: c.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="body" tone={value ? 'ink' : 'muted'}>{value ? formatDate(value) : 'Pick a date'}</Text>
        <Icon icon={Calendar} size={20} tone="muted" />
      </ScalePressable>
      {hint ? <Text variant="caption" tone="muted">{hint}</Text> : null}
    </View>
  );
}

export function DatePickSheet({ open, title, value, onPick, onClose }: { open: boolean; title: string; value?: string; onPick: (iso: string) => void; onClose: () => void }) {
  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <DatePicker value={value} onChange={(iso) => { onPick(iso); onClose(); }} />
      {value ? <Button variant="soft" label="Clear date" onPress={() => { onPick(''); onClose(); }} /> : null}
    </Sheet>
  );
}
