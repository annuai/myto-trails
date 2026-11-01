import { StyleSheet, View, type ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { fixed } from '@/theme/tokens';

type Props = ViewProps & {
  /** Fill the parent behind its other children, without taking part in its layout. Give the parent the same corner radius (or pass `borderRadius` here). */
  layer?: boolean;
  /** The fill of surfaces that are dark in both themes (the ride bar, the action banner) instead of the current theme's. */
  always?: boolean;
};

/**
 * The ink as a surface: a plain View when the token has one colour, a linear gradient when it has more (`inkFill` in the palette,
 * docs/design-tokens.md). Use it wherever the app used to paint `c.ink` as a background; text and icons on it are `onInk`.
 */
export function InkFill({ layer, always, style, children, pointerEvents, ...rest }: Props) {
  const { c } = useTheme();
  const f = always ? fixed.inkFill : c.inkFill;
  const merged = [layer ? StyleSheet.absoluteFill : null, style];
  const touch = pointerEvents ?? (layer ? 'none' : undefined);
  if (f.colors.length < 2) return <View {...rest} pointerEvents={touch} style={[{ backgroundColor: f.colors[0] }, merged]}>{children}</View>;
  return (
    <LinearGradient {...rest} pointerEvents={touch} colors={f.colors as unknown as readonly [string, string, ...string[]]} start={f.start} end={f.end} style={merged}>
      {children}
    </LinearGradient>
  );
}
