import { Animated, Image, View } from 'react-native';
import { adventureBike as art } from './AdventureBike.tokens';

const BODY = require('../../assets/bike/adventure-body.webp') as number;
const WHEEL = require('../../assets/bike/adventure-wheel.webp') as number;

/** The bike's width for a given height, so a caller can place it. */
export const adventureBikeWidth = (height: number): number => (art.width / art.height) * height;

/**
 * An adventure bike with its rider, seen from the side and facing right, wheels included. `height` is its whole height, wheels down to
 * the ground. Its wheels turn with `turns` (an animated count of whole turns; leave it out and they stand still), the body is drawn over
 * them. The bike does not move itself: put it in something that does.
 */
export function AdventureBike({ height, turns }: { height: number; turns?: Animated.AnimatedInterpolation<number> }) {
  /** Points per pixel of the pictures. */
  const k = height / art.height;
  const wheel = art.wheel * k;
  const rotate = turns ? turns.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) : '0deg';
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: art.width * k, height }}>
      {[art.rear, art.front].map((axle) => (
        <Animated.Image key={axle.x} source={WHEEL} resizeMode="contain" accessibilityIgnoresInvertColors style={{ position: 'absolute', left: axle.x * k - wheel / 2, top: axle.y * k - wheel / 2, width: wheel, height: wheel, transform: [{ rotate }] }} />
      ))}
      <Image source={BODY} resizeMode="contain" accessibilityIgnoresInvertColors style={{ position: 'absolute', left: 0, top: 0, width: art.width * k, height: art.bodyHeight * k }} />
    </View>
  );
}
