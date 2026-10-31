import { View } from 'react-native';
import { ArrowRight, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { fixed, opacity, radius, space, size } from '@/theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';
import { ScalePressable } from './motion';
import { button } from './Button.tokens';

/** `emergency` is a solid red with white text, for calling for help: it must not take the dark theme's near-black card colour. */
type Variant = 'primary' | 'accent' | 'soft' | 'danger' | 'emergency';
type Props = {
  label: string; onPress?: () => void; variant?: Variant; icon?: LucideIcon; arrow?: boolean;
  big?: boolean; disabled?: boolean; align?: 'center' | 'between'; trailing?: string; flex?: boolean;
};

export function Button({ label, onPress, variant = 'primary', icon, arrow, big, disabled, align, trailing, flex }: Props) {
  const { c } = useTheme();
  const bg = { primary: c.ink, accent: c.accent, soft: c.card, danger: c.card, emergency: fixed.stopFill }[variant];
  const fg = (variant === 'primary' ? 'onInk' : variant === 'accent' ? 'onInk' : variant === 'danger' ? 'stop' : 'ink') as 'onInk' | 'ink' | 'stop';
  const fgColor = variant === 'accent' ? c.accentInk : variant === 'emergency' ? fixed.white : undefined;
  const between = (align ?? (arrow || trailing ? 'between' : 'center')) === 'between';
  return (
    <ScalePressable scaleTo={0.97}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: big ? size.bigButton : size.button, borderRadius: radius.control, paddingHorizontal: space[5], backgroundColor: bg,
        flexDirection: 'row', alignItems: 'center', justifyContent: between ? 'space-between' : 'center', gap: space[3],
        opacity: disabled ? opacity.disabled : pressed ? opacity.pressed : 1, flex: flex ? 1 : undefined,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        {icon ? <Icon icon={icon} size={22} tone={fg} color={fgColor} /> : null}
        <Text variant="bodyMedium" tone={fg} style={[big && { fontSize: button.bigLabel }, fgColor ? { color: fgColor } : null]}>{label}</Text>
      </View>
      {trailing ? <Text variant="data" tone="muted">{trailing}</Text> : null}
      {arrow ? <Icon icon={ArrowRight} size={20} tone={fg} /> : null}
    </ScalePressable>
  );
}
