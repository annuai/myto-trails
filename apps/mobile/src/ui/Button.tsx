import { View } from 'react-native';
import { ArrowRight, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { fixed, opacity, radius, space, size } from '@/theme/tokens';
import { Icon } from './Icon';
import { InkFill } from './InkFill';
import { Text } from './Text';
import { ScalePressable } from './motion';
import { button } from './Button.tokens';

/** `emergency` is a solid red with white text, for calling for help: it must not take the dark theme's near-black card colour. */
type Variant = 'primary' | 'accent' | 'soft' | 'danger' | 'emergency';
type Props = {
  label: string; onPress?: () => void; variant?: Variant; icon?: LucideIcon; arrow?: boolean;
  big?: boolean; disabled?: boolean; align?: 'center' | 'between'; trailing?: string; flex?: boolean;
  /** Read by screen readers instead of `label`, for a button whose visible text needs the object it acts on ('Delete' becomes 'Delete Karnataka'). */ accessibilityLabel?: string;
  /** Set when a soft button sits on a Card, so its fill differs from the card's. */ onCard?: boolean;
};

export function Button({ label, onPress, variant = 'primary', icon, arrow, big, disabled, align, trailing, flex, onCard, accessibilityLabel }: Props) {
  const { c } = useTheme();
  const bg = { primary: undefined, accent: c.accent, soft: onCard ? c.raised : c.card, danger: onCard ? c.raised : c.card, emergency: fixed.stopFill }[variant];
  const fg = (variant === 'primary' ? 'onInk' : variant === 'accent' ? 'onInk' : variant === 'danger' ? 'stop' : 'ink') as 'onInk' | 'ink' | 'stop';
  const fgColor = variant === 'accent' ? c.accentInk : variant === 'emergency' ? fixed.white : undefined;
  const between = (align ?? (arrow || trailing ? 'between' : 'center')) === 'between';
  return (
    <ScalePressable scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: big ? size.bigButton : size.button, borderRadius: radius.control, paddingHorizontal: space[5], backgroundColor: bg,
        flexDirection: 'row', alignItems: 'center', justifyContent: between ? 'space-between' : 'center', gap: space[3],
        opacity: disabled ? opacity.disabled : pressed ? opacity.pressed : 1, flex: flex ? 1 : undefined,
      })}
    >
      {variant === 'primary' ? <InkFill layer style={{ borderRadius: radius.control }} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        {icon ? <Icon icon={icon} size={22} tone={fg} color={fgColor} /> : null}
        <Text variant="bodyMedium" tone={fg} style={[big && { fontSize: button.bigLabel }, fgColor ? { color: fgColor } : null]}>{label}</Text>
      </View>
      {trailing ? <Text variant="data" tone="muted">{trailing}</Text> : null}
      {/* In a View: on the web a bare icon is not positioned, so the ink fill layer would paint over it. */}
      {arrow ? <View><Icon icon={ArrowRight} size={20} tone={fg} /></View> : null}
    </ScalePressable>
  );
}
