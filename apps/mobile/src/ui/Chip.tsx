import { View } from 'react-native';
import { AlertTriangle, Check, CircleHelp, X, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';
import { Text } from './Text';
import { ScalePressable } from './motion';

import { space, radius, size } from '@/theme/tokens';
export type Status = 'good' | 'caution' | 'stop' | 'unknown';
const glyph: Record<Status, LucideIcon> = { good: Check, caution: AlertTriangle, stop: X, unknown: CircleHelp };

/** Status is always glyph + word + colour, never colour alone (docs/09). */
export function StatusChip({ status, label }: { status: Status; label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ alignSelf: 'flex-start', minHeight: size.chip, paddingHorizontal: space[3], borderRadius: radius.chip, flexDirection: 'row', alignItems: 'center', gap: space[2], backgroundColor: c.raised }}>
      <Icon icon={glyph[status]} size={16} tone={status} strokeWidth={2.25} />
      <Text variant="labelMedium" tone={status}>{label}</Text>
    </View>
  );
}

/** Filter or choice chip. */
export function ChoiceChip({ label, selected, onPress, icon, raised }: { label: string; selected?: boolean; onPress?: () => void; icon?: LucideIcon; raised?: boolean }) {
  const { c } = useTheme();
  return (
    <ScalePressable scaleTo={0.95}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={{ minHeight: size.compact, paddingHorizontal: space[5], borderRadius: radius.chip, flexDirection: 'row', alignItems: 'center', gap: space[2], backgroundColor: selected ? c.ink : raised ? c.raised : c.card }}
    >
      {icon ? <Icon icon={icon} size={18} tone={selected ? 'onInk' : 'ink'} /> : null}
      <Text variant="labelMedium" tone={selected ? 'onInk' : 'ink'}>{label}</Text>
    </ScalePressable>
  );
}
