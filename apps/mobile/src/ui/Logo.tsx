import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { LOGO_PATHS, LOGO_RATIO, LOGO_VIEWBOX } from './logoPaths';
import { logo } from './Logo.tokens';

/** The Myto Moto logo as a vector: dark on light screens, white on dark ones, sharp at any size. */
export function Logo({ height = logo.standard }: { height?: number }) {
  const { c } = useTheme();
  const fill = c.logo;
  return (
    <Svg width={height * LOGO_RATIO} height={height} viewBox={LOGO_VIEWBOX} role="img" aria-label="Myto Moto">
      {LOGO_PATHS.map((d, i) => <Path key={i} d={d} fill={fill} />)}
    </Svg>
  );
}
