import { Pressable } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';

type Props = { icon: LucideIcon; label: string; onPress?: () => void; plain?: boolean; size?: number; tone?: 'ink' | 'muted' | 'accent' | 'stop' };

export function IconButton({ icon, label, onPress, plain, size = 48, tone = 'ink' }: Props) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: plain ? (pressed ? c.line : 'transparent') : pressed ? c.raised : c.card,
      })}
    >
      <Icon icon={icon} size={22} tone={tone} />
    </Pressable>
  );
}
