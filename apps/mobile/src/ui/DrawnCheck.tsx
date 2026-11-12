import { useEffect } from 'react';
import { Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { motion } from '@/theme/tokens';
import { ARRIVE, useReducedMotion } from './motion';
import { useAnimatedValue } from './useAnimatedValue';

const AnimatedPath = Animated.createAnimatedComponent(Path);
/** The check's path in a 24 point box, and its length (it is the dash length the draw animates). */
const D = 'M5 12.5 L10 17.5 L19 7';
const LENGTH = 24;

/**
 * A check mark that draws itself when `on` turns true (and is simply there when it starts true, or when the phone asks for reduced motion).
 * `delay` waits that long first, so a check can follow a ring closing.
 */
export function DrawnCheck({ on, color, size, stroke, delay = 0, ms = motion.duration.quick }: { on: boolean; color: string; size: number; stroke: number; delay?: number; ms?: number }) {
  const reduced = useReducedMotion();
  const drawn = useAnimatedValue(on ? 1 : 0);
  useEffect(() => {
    if (!on) { drawn.setValue(0); return; }
    if (reduced) { drawn.setValue(1); return; }
    Animated.timing(drawn, { toValue: 1, duration: ms, delay, easing: ARRIVE, useNativeDriver: false }).start();
  }, [on, reduced, delay, ms, drawn]);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <AnimatedPath d={D} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={LENGTH} strokeDashoffset={drawn.interpolate({ inputRange: [0, 1], outputRange: [LENGTH, 0] })} />
    </Svg>
  );
}
