import { Image, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';

const RATIO = 2170 / 725;

/** The rider on the ridge, full width at the very end of the You page. Its top edge melts into the page colour. */
export function RiderBanner() {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={{ width, height: width / RATIO }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image source={require('../../assets/rider-on-ridge.webp')} style={{ width, height: width / RATIO }} resizeMode="cover" accessibilityIgnoresInvertColors />
      <LinearGradient colors={[c.paper, 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%' }} />
    </View>
  );
}
