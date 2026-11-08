import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, View } from 'react-native';
import { startEngine } from '@/lib/haptics';
import { useMe } from '@/api/useApi';
import { chooseRider, type PullRider } from '@/lib/pullBikeRider';
import { useLatest } from '@/lib/useLatest';
import { AdventureBike, adventureBikeWidth, bikeArt } from './AdventureBike';
import { pullBike } from './PullBike.tokens';
import { useAnimatedValue } from './useAnimatedValue';
import { useReducedMotion } from './motion';


/**
 * A small delight: pull the page down well past the quote and a bike with its rider rides across (a woman on a black Dominar 400, or a man on an adventure bike; a woman only ever sees the woman), wheels on the top edge of the
 * first card, with a firm tap as it sets off and a soft engine rumble while it crosses. It rides once per pull; letting the page settle
 * back to its top arms it again. Placed in the page's scrolling content, `baseline` points from the top of that content to the card's top edge.
 */
export function PullBike({ scrollY, baseline, fingerDown }: { scrollY: Animated.Value; baseline: number; /** Android: set while a finger is on the page, so a flick that merely coasts up to the top never sends the bike. */ fingerDown?: { current: boolean } }) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(Dimensions.get('window').width);
  const run = useAnimatedValue(0);
  const riding = useRef(false);
  const armed = useRef(true);
  const stopEngine = useRef<() => void>(undefined);
  // Who rides is picked on every pull, from the rider's own private profile (the same one the Profile page shows).
  const [rider, setRider] = useState<PullRider>('man');
  const gender = useMe().data?.profile.gender;
  const pick = useLatest(() => chooseRider(gender, Math.random()));
  const art = bikeArt(rider);
  const w = adventureBikeWidth(pullBike.height, rider);
  // The wheels turn as far as the bike travels: the page's width and its own, over a wheel's circumference.
  const turns = (width + w) / (Math.PI * art.wheel * (pullBike.height / art.height));

  useEffect(() => {
    if (reduced) return;
    const go = () => {
      riding.current = true;
      armed.current = false;
      setRider(pick());
      run.setValue(0);
      stopEngine.current = startEngine(pullBike.runMs, pullBike.rumbleMs);
      Animated.timing(run, { toValue: 1, duration: pullBike.runMs, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(() => {
        stopEngine.current?.();
        riding.current = false;
      });
    };
    const id = scrollY.addListener(({ value }) => {
      if (value <= -pullBike.trigger && armed.current && !riding.current && (!fingerDown || fingerDown.current)) go();
      else if (value >= 0) armed.current = true;
    });
    return () => { scrollY.removeListener(id); stopEngine.current?.(); };
  }, [scrollY, reduced, run, pick, fingerDown]);

  if (reduced) return null;
  const bobs = Array.from({ length: pullBike.bobs * 2 + 1 }, (_, i) => i / (pullBike.bobs * 2));
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ position: 'absolute', left: 0, right: 0, top: baseline - pullBike.height, height: pullBike.height }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: [
        { translateX: run.interpolate({ inputRange: [0, 1], outputRange: [-w, width] }) },
        { translateY: run.interpolate({ inputRange: bobs, outputRange: bobs.map((_, i) => (i % 2 ? -pullBike.bob : 0)) }) },
      ] }}>
        <AdventureBike height={pullBike.height} rider={rider} turns={run.interpolate({ inputRange: [0, 1], outputRange: [0, turns] })} />
      </Animated.View>
    </View>
  );
}
