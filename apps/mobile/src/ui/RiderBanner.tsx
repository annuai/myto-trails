import { useState } from 'react';
import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';

// The picture is stored at three sizes (rider-on-ridge, @2x, @3x) so the phone draws it about one pixel to one: the fine dot pattern
// in the artwork turns into noise when a big file is squeezed down by the graphics chip.
const RATIO = 1206 / 403;

/** The rider on the ridge, as wide as the page it sits in, at the very end of the You page. Its top edge melts into the page colour. */
export function RiderBanner() {
  const { c } = useTheme();
  // The page can be narrower than the window (a centred column on a wide screen), so size from the page, not the window.
  const [width, setWidth] = useState(0);
  return (
    <View pointerEvents="none" onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ alignSelf: 'stretch', height: width / RATIO }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {width > 0 ? (
        <>
          <Image source={require('../../assets/rider-on-ridge.jpg')} style={{ width, height: width / RATIO }} resizeMode="cover" accessibilityIgnoresInvertColors />
          {/* The fade goes from the page's own colour at this end of the page to the same colour with no opacity. 'transparent' is transparent
              black on the phone, and fading to it leaves a grey band; and the page is bluer here than the plain paper colour. */}
          <LinearGradient colors={[c.gradient[2], `${c.gradient[2]}00`]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%' }} />
        </>
      ) : null}
    </View>
  );
}
