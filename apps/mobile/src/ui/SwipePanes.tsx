import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Dimensions, PanResponder, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isSideways, swipeOffset, swipeTarget } from '@/lib/swipePanes';
import { useLatest } from '@/lib/useLatest';
import { EASE, useReducedMotion } from './motion';
import { swipePanes } from './SwipePanes.tokens';
import { tabBar } from './TabBar.tokens';
import { space } from '@/theme/tokens';
import { useAnimatedValue } from './useAnimatedValue';

/**
 * Lets the rider swipe between the views a `SegmentedTabs` switches: right to left for the next, left to right for the previous. The view follows the
 * finger, carries on out of sight when let go far enough or flicked, and the next one slides in from the side it was swiped towards; a short pull
 * springs back. Tapping the tabs slides the new view in a little instead. Pass the chosen view as `children`, and the same `keys` and `value` as the tabs.
 * The swipe takes over only once the move is clearly sideways, so scrolling the page and pressing cards still work.
 * The swipeable area runs from the top of the views to the tab bar, even where a view is short or empty, so a swipe works on the empty part of the page too.
 */
export function SwipePanes<T extends string>({ keys, value, onChange, enabled = true, children }: { keys: readonly T[]; value: T; onChange: (key: T) => void; enabled?: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  const x = useAnimatedValue(0);
  const [width, setWidth] = useState(0);
  const frame = useRef<React.ComponentRef<typeof View>>(null);
  const insets = useSafeAreaInsets();
  /** How tall the swipeable area is at least: from where the views start to just above the tab bar. */
  const [fill, setFill] = useState(0);
  const reserve = tabBar.height + space[6] + insets.bottom;
  const measureTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(measureTimer.current), []);
  const index = Math.max(0, keys.indexOf(value));
  const now = useLatest(() => ({ index, count: keys.length, width, enabled, reduced }));
  const change = useLatest((i: number) => onChange(keys[i]!));
  /** Which side the next view comes from after a swipe: 1 from the right, -1 from the left. A tap leaves it unset. */
  const from = useRef<number | undefined>(undefined);
  const mark = useLatest((dir: number) => { from.current = dir; });
  const shown = useRef(index);

  useLayoutEffect(() => {
    if (shown.current === index) return;
    const dir = Math.sign(index - shown.current);
    shown.current = index;
    x.stopAnimation();
    if (reduced || !width) { x.setValue(0); from.current = undefined; return; }
    x.setValue(from.current === undefined ? dir * width * swipePanes.tap : from.current * width);
    from.current = undefined;
    Animated.timing(x, { toValue: 0, duration: swipePanes.enter, easing: EASE, useNativeDriver: true }).start();
  }, [x, index, width, reduced]);

  const pan = useMemo(() => {
    const settle = () => Animated.timing(x, { toValue: 0, duration: swipePanes.rest, easing: EASE, useNativeDriver: true }).start();
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => now().enabled && isSideways(g.dx, g.dy, swipePanes.lock, swipePanes.lockRatio),
      onPanResponderGrant: () => x.stopAnimation(),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => { const s = now(); x.setValue(swipeOffset(g.dx, s.index, s.count, swipePanes)); },
      onPanResponderRelease: (_, g) => {
        const s = now();
        const next = swipeTarget(g.dx, g.vx, s.width, s.index, s.count, swipePanes);
        if (next === s.index) return settle();
        const dir = next > s.index ? 1 : -1;
        if (s.reduced) { x.setValue(0); return change(next); }
        Animated.timing(x, { toValue: -dir * s.width, duration: swipePanes.commit, easing: EASE, useNativeDriver: true }).start(({ finished }) => {
          if (!finished) return;
          mark(dir);
          change(next);
        });
      },
      onPanResponderTerminate: settle,
    });
  }, [x, now, change, mark]);

  const span = width || 1;
  return (
    <View ref={frame} style={{ overflow: 'hidden', minHeight: fill }} {...pan.panHandlers}
      onLayout={(e) => {
        setWidth(e.nativeEvent.layout.width);
        // Where the views start on the screen, measured once laid out: the rest of the screen down to the tab bar is theirs to swipe.
        const measure = () => frame.current?.measureInWindow((_x, y) => setFill(Math.max(0, Math.round(Dimensions.get('window').height - y - reserve))));
        measure();
        // Again once the page has settled: on Android a tab page is scrolled to its resting place just after it first lays out, which moves the views on the screen.
        clearTimeout(measureTimer.current);
        measureTimer.current = setTimeout(measure, swipePanes.remeasureMs);
      }}>
      <Animated.View style={{ opacity: x.interpolate({ inputRange: [-span, 0, span], outputRange: [1 - swipePanes.fade, 1, 1 - swipePanes.fade], extrapolate: 'clamp' }), transform: [{ translateX: x }] }}>{children}</Animated.View>
    </View>
  );
}
