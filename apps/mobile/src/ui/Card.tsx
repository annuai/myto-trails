import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Props = { children: ReactNode; padded?: boolean; style?: ViewStyle };

/** Soft rounded surface. Never nest a Card in a Card; use rows and spacing inside. */
export function Card({ children, padded = true, style }: Props) {
  const { c } = useTheme();
  return <View style={[{ backgroundColor: c.card, borderRadius: radius.card, padding: padded ? space[5] : 0, overflow: 'hidden' }, style]}>{children}</View>;
}
