import { View } from 'react-native';
import { ArrowRight, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';
import { ScalePressable } from './motion';

type Variant = 'primary' | 'accent' | 'soft' | 'danger';
type Props = {
  label: string; onPress?: () => void; variant?: Variant; icon?: LucideIcon; arrow?: boolean;
  big?: boolean; disabled?: boolean; align?: 'center' | 'between'; trailing?: string; flex?: boolean;
};

export function Button({ label, onPress, variant = 'primary', icon, arrow, big, disabled, align, trailing, flex }: Props) {
  const { c } = useTheme();
  const bg = { primary: c.ink, accent: c.accent, soft: c.card, danger: c.card }[variant];
  const fg = (variant === 'primary' ? 'onInk' : variant === 'accent' ? 'onInk' : variant === 'danger' ? 'stop' : 'ink') as 'onInk' | 'ink' | 'stop';
  const fgColor = variant === 'accent' ? c.accentInk : undefined;
  const between = (align ?? (arrow || trailing ? 'between' : 'center')) === 'between';
  return (
    <ScalePressable scaleTo={0.97}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: big ? 72 : 56, borderRadius: radius.control, paddingHorizontal: 20, backgroundColor: bg,
        flexDirection: 'row', alignItems: 'center', justifyContent: between ? 'space-between' : 'center', gap: 10,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1, flex: flex ? 1 : undefined,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {icon ? <Icon icon={icon} size={22} tone={fg} /> : null}
        <Text variant="bodyMedium" tone={fg} style={[big && { fontSize: 20 }, fgColor ? { color: fgColor } : null]}>{label}</Text>
      </View>
      {trailing ? <Text variant="data" tone="muted">{trailing}</Text> : null}
      {arrow ? <Icon icon={ArrowRight} size={20} tone={fg} /> : null}
    </ScalePressable>
  );
}
