import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, View } from 'react-native';
import { buzz } from '@/lib/haptics';
import { AdventureBike, adventureBikeWidth } from './AdventureBike';
import { adventureBike } from './AdventureBike.tokens';
import { pullBike } from './PullBike.tokens';
import { useAnimatedValue } from './useAnimatedValue';
import { useReducedMotion } from './motion';


/**
 * A small delight: pull the page down well past the quote and an adventure bike with its rider rides across, wheels on the top edge of the
 * first card, with a firm tap as it sets off and a soft engine rumble while it crosses. It rides once per pull; letting the page settle
 * back to its top arms it again. Placed in the page's scrolling content, `baseline` points from the top of that content to the card's top edge.
 */
export function PullBike({ scrollY, baseline }: { scrollY: Animated.Value; baseline: number }) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(Dimensions.get('window').width);
  const run = useAnimatedValue(0);
  const riding = useRef(false);
  const armed = useRef(true);
  const rumble = useRef<ReturnType<typeof setInterval>>(undefined);
  const w = adventureBikeWidth(pullBike.height);
  // The wheels turn as far as the bike travels: the page's width and its own, over a wheel's circumference.
  const turns = (width + w) / (Math.PI * adventureBike.wheel * (pullBike.height / adventureBike.height));

  useEffect(() => {
    if (reduced) return;
    const go = () => {
      riding.current = true;
      armed.current = false;
      run.setValue(0);
      buzz.rev();
      rumble.current = setInterval(buzz.rumble, pullBike.rumbleMs);
      Animated.timing(run, { toValue: 1, duration: pullBike.runMs, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(() => {
        clearInterval(rumble.current);
        riding.current = false;
      });
    };
    const id = scrollY.addListener(({ value }) => {
      if (value <= -pullBike.trigger && armed.current && !riding.current) go();
      else if (value >= 0) armed.current = true;
    });
    return () => { scrollY.removeListener(id); clearInterval(rumble.current); };
  }, [scrollY, reduced, run]);

  if (reduced) return null;
  const bobs = Array.from({ length: pullBike.bobs * 2 + 1 }, (_, i) => i / (pullBike.bobs * 2));
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ position: 'absolute', left: 0, right: 0, top: baseline - pullBike.height, height: pullBike.height }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: [
        { translateX: run.interpolate({ inputRange: [0, 1], outputRange: [-w, width] }) },
        { translateY: run.interpolate({ inputRange: bobs, outputRange: bobs.map((_, i) => (i % 2 ? -pullBike.bob : 0)) }) },
      ] }}>
        <AdventureBike height={pullBike.height} turns={run.interpolate({ inputRange: [0, 1], outputRange: [0, turns] })} />
      </Animated.View>
    </View>
  );
}
