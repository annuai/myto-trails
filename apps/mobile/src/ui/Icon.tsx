import type { LucideIcon } from 'lucide-react-native';
import type { Tone } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

// Lucide (ISC licence, open source). Every icon in the app goes through this component.
export type IconName = LucideIcon;
type Props = { icon: LucideIcon; size?: number; tone?: Tone; strokeWidth?: number; /** A colour that is not one of the tones, for an icon on a fixed-colour fill. */ color?: string };

export function Icon({ icon: Glyph, size = 24, tone = 'ink', strokeWidth = 1.75, color }: Props) {
  const { c } = useTheme();
  return <Glyph size={size} color={color ?? c[tone]} strokeWidth={strokeWidth} />;
}
