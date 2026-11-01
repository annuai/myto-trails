import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { buzz } from '@/lib/haptics';
import { useLatest } from '@/lib/useLatest';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, type TypeVariant } from '@/theme/tokens';
import { useReducedMotion } from './motion';
import { useAnimatedValue } from './useAnimatedValue';
import { Text } from './Text';
import { wheel } from './Wheel.tokens';

const ROW = wheel.row;
const PAD = Math.floor(wheel.rows / 2);
const HEIGHT = ROW * wheel.rows;
const last = (n: number) => Math.max(0, n - 1);

/**
 * One column of a wheel picker: rows that snap under a fixed band, the rows either side fading in size and opacity.
 * Controlled: `index` is the chosen row and `onIndex` is told when a scroll settles on another. If the parent answers with a
 * different index (a day that no longer exists in the new month, a date outside min and max) the wheel moves there.
 * For a screen reader it is one adjustable control: swipe up or down to step a row. Tapping a row steps to it.
 */
export function Wheel({ items, index, onIndex, label, variant = 'section', flex = wheel.narrow }: { items: string[]; index: number; onIndex: (i: number) => void; label: string; variant?: TypeVariant; flex?: number }) {
  const reduced = useReducedMotion();
  const y = useAnimatedValue(index * ROW);
  const scroller = useRef<{ scrollTo: (o: { y: number; animated: boolean }) => void } | null>(null);
  const at = useRef(index);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [settled, setSettled] = useState(0);
  const place = (i: number, animated: boolean) => scroller.current?.scrollTo({ y: i * ROW, animated: animated && !reduced });
  const clampRow = (i: number) => Math.max(0, Math.min(last(items.length), i));
  // Follow the parent: on first show, and whenever it moves the chosen row or the list shrinks.
  useEffect(() => {
    const i = clampRow(index);
    if (i !== at.current || settled === 0) { at.current = i; place(i, false); }
  }, [index, items.length, settled]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(timer.current), []);
  const settle = useLatest((offset: number) => {
    const i = clampRow(Math.round(offset / ROW));
    if (Platform.OS === 'web') place(i, true);
    setSettled((n) => n + 1);
    if (i !== at.current) { at.current = i; buzz.tick(); onIndex(i); }
  });
  const onSettleEvent = useLatest((e: NativeSyntheticEvent<NativeScrollEvent>) => settle(e.nativeEvent.contentOffset.y));
  const onScroll = useLatest((e: unknown) => {
    if (Platform.OS !== 'web') return;
    const offset = (e as NativeSyntheticEvent<NativeScrollEvent>).nativeEvent.contentOffset.y;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => settle(offset), wheel.settleMs);
  });
  const goTo = useLatest((i: number) => { const n = clampRow(i); if (n === at.current) return; at.current = n; place(n, true); buzz.tick(); onIndex(n); setSettled((s) => s + 1); });
  const step = useLatest((d: number) => goTo(at.current + d));
  return (
    <Animated.ScrollView
      ref={(r) => { scroller.current = r as unknown as typeof scroller.current; }}
      style={{ flex, height: HEIGHT }}
      contentContainerStyle={{ paddingVertical: ROW * PAD }}
      contentOffset={{ x: 0, y: index * ROW }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ROW}
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: true, listener: onScroll })}
      onMomentumScrollEnd={onSettleEvent}
      onScrollEndDrag={onSettleEvent}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: items[clampRow(index)] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      {items.map((t, i) => {
        const range = [-2, -1, 0, 1, 2].map((d) => (i + d) * ROW);
        const [o0, o1, o2] = wheel.fadeOpacity;
        const [s0, s1, s2] = wheel.fadeScale;
        return (
          <Pressable key={t} accessible={false} importantForAccessibility="no" onPress={() => goTo(i)}>
            <Animated.View style={{ height: ROW, alignItems: 'center', justifyContent: 'center', opacity: y.interpolate({ inputRange: range, outputRange: [o2, o1, o0, o1, o2], extrapolate: 'clamp' }), transform: [{ scale: y.interpolate({ inputRange: range, outputRange: [s2, s1, s0, s1, s2], extrapolate: 'clamp' }) }] }}>
              <Text variant={variant}>{t}</Text>
            </Animated.View>
          </Pressable>
        );
      })}
    </Animated.ScrollView>
  );
}

/** The columns side by side with the soft band behind the chosen row. */
export function WheelSet({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ height: HEIGHT, justifyContent: 'center' }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: ROW * PAD, height: ROW, borderRadius: radius.control, backgroundColor: c.raised }} />
      <View style={{ flexDirection: 'row' }}>{children}</View>
    </View>
  );
}
