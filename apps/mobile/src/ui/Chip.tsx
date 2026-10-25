import { Pressable, View } from 'react-native';
import { AlertTriangle, Check, CircleHelp, X, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';
import { Text } from './Text';

export type Status = 'good' | 'caution' | 'stop' | 'unknown';
const glyph: Record<Status, LucideIcon> = { good: Check, caution: AlertTriangle, stop: X, unknown: CircleHelp };

/** Status is always glyph + word + colour, never colour alone (docs/09). */
export function StatusChip({ status, label }: { status: Status; label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ alignSelf: 'flex-start', minHeight: 32, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.raised }}>
      <Icon icon={glyph[status]} size={16} tone={status} strokeWidth={2.25} />
      <Text variant="labelMedium" tone={status}>{label}</Text>
    </View>
  );
}

/** Filter or choice chip. */
export function ChoiceChip({ label, selected, onPress, icon, raised }: { label: string; selected?: boolean; onPress?: () => void; icon?: LucideIcon; raised?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: selected ? c.ink : raised ? c.raised : c.card }}
    >
      {icon ? <Icon icon={icon} size={18} tone={selected ? 'onInk' : 'ink'} /> : null}
      <Text variant="labelMedium" tone={selected ? 'onInk' : 'ink'}>{label}</Text>
    </Pressable>
  );
}
