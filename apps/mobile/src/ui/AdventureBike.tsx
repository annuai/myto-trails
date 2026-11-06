import { Animated, Image, View } from 'react-native';
import { adventureBike, dominarBike } from './AdventureBike.tokens';

/** Which rider is on the bike: the man on the adventure bike, or the woman on the black Dominar 400. */
export type Rider = 'man' | 'woman';

const BIKES = {
  man: { art: adventureBike, body: require('../../assets/bike/adventure-body.webp') as number, wheel: require('../../assets/bike/adventure-wheel.webp') as number },
  woman: { art: dominarBike, body: require('../../assets/bike/dominar-woman-body.webp') as number, wheel: require('../../assets/bike/dominar-wheel.webp') as number },
} as const;

/** The numbers (in the body picture's pixels) of one rider's bike. */
export const bikeArt = (rider: Rider) => BIKES[rider].art;

/** The bike's width for a given height, so a caller can place it. */
export const adventureBikeWidth = (height: number, rider: Rider = 'man'): number => (BIKES[rider].art.width / BIKES[rider].art.height) * height;

/**
 * A bike with its rider, seen from the side and facing right, wheels included. `height` is its whole height, wheels down to
 * the ground. Its wheels turn with `turns` (an animated count of whole turns; leave it out and they stand still), the body is drawn over
 * them. The bike does not move itself: put it in something that does.
 */
export function AdventureBike({ height, turns, rider = 'man' }: { height: number; turns?: Animated.AnimatedInterpolation<number>; rider?: Rider }) {
  const { art, body, wheel: wheelPicture } = BIKES[rider];
  /** Points per pixel of the pictures. */
  const k = height / art.height;
  const wheel = art.wheel * k;
  const rotate = turns ? turns.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) : '0deg';
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: art.width * k, height }}>
      {[art.rear, art.front].map((axle) => (
        <Animated.Image key={axle.x} source={wheelPicture} resizeMode="contain" accessibilityIgnoresInvertColors style={{ position: 'absolute', left: axle.x * k - wheel / 2, top: axle.y * k - wheel / 2, width: wheel, height: wheel, transform: [{ rotate }] }} />
      ))}
      <Image source={body} resizeMode="contain" accessibilityIgnoresInvertColors style={{ position: 'absolute', left: 0, top: 0, width: art.width * k, height: art.bodyHeight * k }} />
    </View>
  );
}
