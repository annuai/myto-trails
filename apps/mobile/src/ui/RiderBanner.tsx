import { useState } from 'react';
import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';

const RATIO = 2170 / 725;

/** The rider on the ridge, as wide as the page it sits in, at the very end of the You page. Its top edge melts into the page colour. */
export function RiderBanner() {
  const { c } = useTheme();
  // The page can be narrower than the window (a centred column on a wide screen), so size from the page, not the window.
  const [width, setWidth] = useState(0);
  return (
    <View pointerEvents="none" onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ alignSelf: 'stretch', height: width / RATIO }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {width > 0 ? (
        <>
          <Image source={require('../../assets/rider-on-ridge.webp')} style={{ width, height: width / RATIO }} resizeMode="cover" accessibilityIgnoresInvertColors />
          <LinearGradient colors={[c.paper, 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%' }} />
        </>
      ) : null}
    </View>
  );
}
