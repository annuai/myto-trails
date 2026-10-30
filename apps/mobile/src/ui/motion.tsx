import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useAnimatedValue } from './useAnimatedValue';

/** Respect the system's "reduce motion" setting: animations collapse to nothing. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(Platform.OS === 'web' ? !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches : false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

export const EASE = Easing.bezier(0.4, 0, 0.2, 1); // the same curve as the website

/** Fade and rise into place on mount. `delay` staggers a list. */
export function Reveal({ children, delay = 0, distance = 14, style }: { children: ReactNode; delay?: number; distance?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const v = useAnimatedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return v.setValue(1);
    Animated.timing(v, { toValue: 1, duration: 320, delay, easing: EASE, useNativeDriver: true }).start();
  }, [v, delay, reduced]);
  return <Animated.View style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }, style]}>{children}</Animated.View>;
}

const APressable = Animated.createAnimatedComponent(Pressable);

/** A Pressable that gives a little under the finger. Same props as Pressable. */
export const ScalePressable = forwardRef<React.ComponentRef<typeof Pressable>, PressableProps & { scaleTo?: number }>(function ScalePressable({ style, onPressIn, onPressOut, scaleTo = 0.97, ...rest }, ref) {
  const reduced = useReducedMotion();
  const scale = useAnimatedValue(1);
  const [pressed, setPressed] = useState(false);
  const to = (value: number) => { if (!reduced) Animated.spring(scale, { toValue: value, speed: 50, bounciness: 0, useNativeDriver: true }).start(); };
  // Animated components cannot take a style function, so the pressed state is tracked here and the style resolved by hand.
  const resolved = typeof style === 'function' ? style({ pressed, hovered: false } as never) : style;
  return (
    <APressable
      ref={ref}
      {...rest}
      onPressIn={(e) => { setPressed(true); to(scaleTo); onPressIn?.(e); }}
      onPressOut={(e) => { setPressed(false); to(1); onPressOut?.(e); }}
      style={[resolved, { transform: [{ scale }] }] as never}
    />
  );
});
