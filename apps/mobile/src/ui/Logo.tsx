import { Image } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

const source = require('../../assets/myto-logo.png');
const RATIO = 91 / 42;

/** The Myto logo. The asset is white on transparent; tint it dark on light screens and white on dark ones. */
export function Logo({ height = 28 }: { height?: number }) {
  const { mode } = useTheme();
  return (
    <Image
      source={source}
      accessibilityLabel="Myto"
      style={{ height, width: height * RATIO, tintColor: mode === 'dark' ? '#ffffff' : '#1a1a1a' }}
      resizeMode="contain"
    />
  );
}
