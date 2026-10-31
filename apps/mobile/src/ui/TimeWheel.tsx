import { useEffect, useRef } from 'react';
import { Animated, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { buzz } from '@/lib/haptics';
import { fromWheel, HOURS, MINUTES, PERIODS, toWheel } from '@/lib/timeWheel';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size, space } from '@/theme/tokens';
import { Text } from './Text';

const ITEM = size.target - space[1];
/** Rows visible at once: the chosen one in the middle and two either side, fading out. */
const ROWS = 5;
const PAD = Math.floor(ROWS / 2);

function Column({ items, index, onIndex, label }: { items: string[]; index: number; onIndex: (i: number) => void; label: string }) {
  const y = useRef(new Animated.Value(index * ITEM)).current;
  const scroller = useRef<{ scrollTo: (o: { y: number; animated: boolean }) => void } | null>(null);
  const at = useRef(index);
  useEffect(() => { scroller.current?.scrollTo({ y: index * ITEM, animated: false }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM)));
    if (i !== at.current) { at.current = i; buzz.tick(); onIndex(i); }
  };
  const step = (d: number) => { const i = Math.max(0, Math.min(items.length - 1, at.current + d)); at.current = i; scroller.current?.scrollTo({ y: i * ITEM, animated: true }); onIndex(i); };
  return (
    <Animated.ScrollView
      ref={(r) => { scroller.current = r as unknown as typeof scroller.current; }}
      style={{ flex: 1, height: ITEM * ROWS }}
      contentContainerStyle={{ paddingVertical: ITEM * PAD }}
      contentOffset={{ x: 0, y: index * ITEM }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM}
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: true })}
      onMomentumScrollEnd={settle}
      onScrollEndDrag={settle}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: items[index] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      {items.map((t, i) => {
        const range = [(i - 2) * ITEM, (i - 1) * ITEM, i * ITEM, (i + 1) * ITEM, (i + 2) * ITEM];
        return (
          <Animated.View key={t} style={{ height: ITEM, alignItems: 'center', justifyContent: 'center', opacity: y.interpolate({ inputRange: range, outputRange: [0.15, 0.45, 1, 0.45, 0.15], extrapolate: 'clamp' }), transform: [{ scale: y.interpolate({ inputRange: range, outputRange: [0.8, 0.9, 1, 0.9, 0.8], extrapolate: 'clamp' }) }] }}>
            <Text variant="dataLarge">{t}</Text>
          </Animated.View>
        );
      })}
    </Animated.ScrollView>
  );
}

/**
 * A time of day to scroll to: hour, minute (every five) and AM or PM, each a column that snaps with a soft tick. The band across the
 * middle is the chosen time. Value is minutes after midnight.
 */
export function TimeWheel({ value, onChange, label }: { value: number; onChange: (minutes: number) => void; label: string }) {
  const { c } = useTheme();
  const w = useRef(toWheel(value));
  const set = (patch: Partial<ReturnType<typeof toWheel>>) => { w.current = { ...w.current, ...patch }; onChange(fromWheel(w.current.hour, w.current.minute, w.current.period)); };
  return (
    <View accessibilityLabel={label} style={{ height: ITEM * ROWS, justifyContent: 'center' }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: ITEM * PAD, height: ITEM, borderRadius: radius.control, backgroundColor: c.raised }} />
      <View style={{ flexDirection: 'row' }}>
        <Column label="Hour" items={HOURS} index={w.current.hour} onIndex={(hour) => set({ hour })} />
        <Column label="Minute" items={MINUTES} index={w.current.minute} onIndex={(minute) => set({ minute })} />
        <Column label="AM or PM" items={PERIODS} index={w.current.period} onIndex={(period) => set({ period })} />
      </View>
    </View>
  );
}
