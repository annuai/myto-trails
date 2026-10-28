import { useState } from 'react';
import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { withAlpha } from '@/theme/color';
import { useTheme } from '@/theme/ThemeProvider';
import { footerPicture } from '@/theme/tokens';

// The picture is stored at three sizes (rider-on-ridge, @2x, @3x) so the phone draws it about one pixel to one: the fine dot pattern
// in the artwork turns into noise when a big file is squeezed down by the graphics chip.
const RATIO = 1206 / 403;

/**
 * The rider on the ridge, as wide as the page it sits in. The page keeps it fixed at the bottom of the screen and slides its content up
 * to uncover it (Screen's `endCap`). Its top edge melts into the page colour.
 */
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
          <LinearGradient colors={[c.gradient[2], withAlpha(c.gradient[2], footerPicture.fadeEndAlpha)]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: footerPicture.fadeHeight }} />
        </>
      ) : null}
    </View>
  );
}
