// The app's text component: a style variant and a colour role from the theme.

import { Text as RNText, type TextProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { type as types, type TypeVariant } from '@/theme/tokens';

import type { Tone } from '@/theme/tokens';
type Props = TextProps & { variant?: TypeVariant; tone?: Tone };

/** Text in a theme variant and tone. */
export function Text({ variant = 'body', tone = 'ink', style, ...rest }: Props) {
  const { c } = useTheme();
  return <RNText {...rest} style={[types[variant], { color: c[tone] }, style]} />;
}
