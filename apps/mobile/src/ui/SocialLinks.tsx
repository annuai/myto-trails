import { Linking, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { size, space } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { ScalePressable } from './motion';

// Lucide no longer ships brand icons, so these are drawn on its 24 grid with its stroke, to sit with the rest.
const SOCIAL = [
  { label: 'Myto on Instagram', url: 'https://www.instagram.com/clubmyto', glyph: (
    <>
      <Rect x={2} y={2} width={20} height={20} rx={5} />
      <Circle cx={12} cy={12} r={4} />
      <Line x1={17.5} y1={6.5} x2={17.51} y2={6.5} />
    </>
  ) },
  { label: 'Myto on X', url: 'https://x.com/clubmyto', glyph: (
    <>
      <Path d="M4 4l11.733 16H20L8.267 4z" />
      <Path d="M4 20l6.768-6.768M20 4l-6.768 6.768" />
    </>
  ) },
  { label: 'Myto on Facebook', url: 'https://www.facebook.com/clubmyto', glyph: <Path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /> },
] as const;

/** Instagram, X and Facebook of Myto, in a row. */
export function SocialLinks() {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space[2] }}>
      {SOCIAL.map((s) => (
        <ScalePressable key={s.label} scaleTo={0.9} accessibilityRole="link" accessibilityLabel={s.label} onPress={() => void Linking.openURL(s.url)} style={{ width: size.target, height: size.target, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">{s.glyph}</Svg>
        </ScalePressable>
      ))}
    </View>
  );
}
