import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { motion, space } from '@/theme/tokens';
import { EASE, useReducedMotion } from './motion';
import { useAnimatedValue } from './useAnimatedValue';
import { skeleton as k } from './Skeleton.tokens';

/**
 * What stands in for a list while it loads: a few soft bars that breathe slowly. It only appears after a short wait, so a quick load never
 * flashes it, and it stands still when the phone asks for reduced motion. Read aloud as "Loading".
 */
export function Skeleton({ rows = 3 }: { rows?: number }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const pulse = useAnimatedValue(k.pulse[1]);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), motion.skeletonDelay);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!visible || reduced) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: k.pulse[0], duration: motion.duration.trace, easing: EASE, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: k.pulse[1], duration: motion.duration.trace, easing: EASE, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [visible, reduced, pulse]);
  return (
    <View accessible accessibilityLabel="Loading" accessibilityLiveRegion="polite" style={{ gap: space[3], minHeight: k.bar }}>
      {visible ? Array.from({ length: rows }, (_, i) => (
        <Animated.View key={i} style={{ height: k.bar, width: k.widths[i % k.widths.length], borderRadius: k.radius, backgroundColor: c.raised, opacity: pulse }} />
      )) : null}
    </View>
  );
}
