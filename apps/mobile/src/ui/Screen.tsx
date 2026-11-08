import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fadeTarget, isTap, touchPoint } from '@/lib/tabFade';
import { useTheme } from '@/theme/ThemeProvider';
import { size, space, layout } from '@/theme/tokens';
import { FloatingHeader, HEADER_HEIGHT } from './FloatingHeader';
import { PullBike } from './PullBike';
import { PullQuote } from './PullQuote';
import { pullQuote } from './PullQuote.tokens';
import { EASE, Reveal } from './motion';
import { tabBarFade } from './tabBarFade';
import { CONTENT_MAX, useLayout } from './useLayout';
import { useAnimatedValue } from './useAnimatedValue';
import { useLatest } from '@/lib/useLatest';

export const TAB_BAR_HEIGHT = 100;
export const TAB_BAR_HEIGHT_LANDSCAPE = 84;
export { CONTENT_MAX };

type Props = { children: ReactNode; overlay?: ReactNode; tabs?: boolean; scroll?: boolean; footer?: ReactNode; /** Fixed logo and notifications bar that floats as a pill once the page scrolls. */ brand?: boolean; /** Pulling the page down a long way, past the quote, sends a bike across the top of the first card (on Android, read from the finger's travel). */ bike?: boolean; /** The floating tab bar fades away near the end of the page and returns on scrolling up or a tap. */ fadeTabs?: boolean; /** Called when the page is scrolled to within a screen of its end, or is shorter than two screens: the cue to load more of a long list. It may be called again before the list has grown, so the caller must ignore it while it is already loading. */ onNearEnd?: () => void; /** A full-width picture fixed to the bottom edge of the screen. It stays put while the page scrolls; at the very end the content slides up and uncovers it. */ endCap?: ReactNode };

/** Page frame: safe-area top, 20 px side margins, scrolls, leaves room for the tab bar. */
export function Screen({ children, overlay, tabs = false, scroll = true, footer, brand = false, bike = false, fadeTabs = false, endCap, onNearEnd }: Props) {
  const scrollY = useAnimatedValue(0);
  const bar = useRef({ prevY: 0, content: 0, layout: 0, value: 1, touch: null as { x: number; y: number } | null }).current;
  /** Height of the fixed end picture, and the page's own size: together they say how much of the picture the content has uncovered. */
  const scroller = useRef<{ scrollTo: (o: { y: number; animated: boolean }) => void } | null>(null);
  const [capHeight, setCapHeight] = useState(0);
  /** A footer's own height, so a tall one never covers the end of the page. */
  const [footerHeight, setFooterHeight] = useState(88);
  const [page, setPage] = useState({ content: 0, layout: 0 });
  /** The scroll area's height, so a short page on Android is still tall enough to rest at the top of its pull space. */
  const [viewHeight, setViewHeight] = useState(0);
  const fingerDown = useRef(false);
  const setBar = (to: number, animate: boolean) => {
    bar.value = to;
    tabBarFade.stopAnimation();
    if (animate) Animated.timing(tabBarFade, { toValue: to, duration: 220, easing: EASE, useNativeDriver: true }).start();
    else tabBarFade.setValue(to);
  };
  // Screens stay mounted behind the tabs, so the bar must come back when this one is left.
  useFocusEffect(useCallback(() => () => { if (fadeTabs) setBar(1, false); }, [fadeTabs])); // eslint-disable-line react-hooks/exhaustive-deps
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { landscape } = useLayout();
  // Keep clear of the notch and rounded corners when the phone is turned.
  const padL = Math.max(size.screenX, insets.left + 12), padR = Math.max(size.screenX, insets.right + 12);
  const bottom = (tabs ? (landscape ? TAB_BAR_HEIGHT_LANDSCAPE : TAB_BAR_HEIGHT) + 24 : insets.bottom + 24) + (footer ? footerHeight : 0);
  const frame = (kids: ReactNode, fill = false) => <Reveal style={{ width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', flex: fill ? 1 : undefined }}>{kids}</Reveal>;
  const top = insets.top + 8 + (brand ? HEADER_HEIGHT + 8 : 0);
  /**
   * Android cannot stretch a page past its top, and its pull-to-refresh would take the whole drag. So on a tab page the page rests `zone` points down
   * in its own scroll area, below a blank space the same height: pulling the page down is really scrolling up into that space, which a finger can
   * measure like iOS's stretch. `pulled` is the scroll position counted from the resting place (negative while pulled), and what the quote, the bike
   * and the header watch; letting go scrolls back to rest. Everywhere else `zone` is 0 and `pulled` is the scroll position itself.
   */
  const zone = Platform.OS === 'android' && tabs && scroll ? pullQuote.zone : 0;
  const pulled = useMemo(() => (zone ? Animated.add(scrollY, -zone) : scrollY) as Animated.Value, [zone, scrollY]);
  const settle = (y: number) => { if (zone && y < zone - 1) scroller.current?.scrollTo({ y: zone, animated: true }); };
  // The picture is uncovered from the bottom up as the page reaches its end: nothing until the transparent space after the content
  // starts to enter the screen, all of it when the page can scroll no further. Bounce past the end changes nothing.
  const maxY = Math.max(0, page.content - page.layout);
  const measured = capHeight > 0 && page.content > 0 && page.layout > 0;
  const uncovered = measured ? scrollY.interpolate({ inputRange: [maxY - capHeight, maxY], outputRange: [0, capHeight], extrapolate: 'clamp' }) : 0;
  /** The scroll handler is made once; `useLatest` keeps it reading the current props. */
  const onScrollEvent = useLatest((e: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    if (onNearEnd && contentSize.height - (contentOffset.y + layoutMeasurement.height) < layoutMeasurement.height) onNearEnd();
    if (!fadeTabs) return;
    const y = e.nativeEvent.contentOffset.y - zone;
    const next = fadeTarget({ y, prevY: bar.prevY, maxY: Math.max(0, bar.content - bar.layout), current: bar.value });
    bar.prevY = y;
    if (next !== bar.value) setBar(next, next > bar.value);
  });
  const body = scroll ? (
    <Animated.ScrollView
      ref={scroller as never}
      scrollEventThrottle={16}
      contentOffset={zone ? { x: 0, y: zone } : undefined}
      overScrollMode={zone ? 'never' : undefined}
      onScrollBeginDrag={zone ? () => { fingerDown.current = true; } : undefined}
      onScrollEndDrag={zone ? (e) => { fingerDown.current = false; if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.1) settle(e.nativeEvent.contentOffset.y); } : undefined}
      onMomentumScrollEnd={zone ? (e) => settle(e.nativeEvent.contentOffset.y) : undefined}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false, listener: onScrollEvent })}
      onLayout={zone || fadeTabs || endCap || onNearEnd ? (e) => { const h = e.nativeEvent.layout.height; bar.layout = h; if (zone) setViewHeight(h); if (endCap) setPage((p) => ({ ...p, layout: h })); } : undefined}
      onContentSizeChange={fadeTabs || endCap || onNearEnd ? (_w, h) => { bar.content = h - zone; if (endCap) setPage((p) => ({ ...p, content: h })); if (onNearEnd && bar.layout > 0 && h - zone < bar.layout * 2) onNearEnd(); } : undefined}
      onTouchStart={fadeTabs ? (e) => { bar.touch = touchPoint(e.nativeEvent); } : undefined}
      onTouchEnd={fadeTabs ? (e) => { if (bar.value < 1 && bar.touch && isTap(bar.touch, touchPoint(e.nativeEvent))) setBar(1, true); } : undefined}
      contentContainerStyle={{ minHeight: zone ? viewHeight + zone : undefined, paddingTop: zone + top, paddingBottom: endCap ? 0 : bottom, paddingLeft: padL, paddingRight: padR }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {bike ? <PullBike scrollY={pulled} baseline={zone + top} fingerDown={zone ? fingerDown : undefined} /> : null}
      {frame(children)}
      {endCap ? <View style={{ height: capHeight }} /> : null}
    </Animated.ScrollView>
  ) : (
    <View style={{ flex: 1, paddingTop: top, paddingLeft: padL, paddingRight: padR, paddingBottom: insets.bottom + 16 + (footer ? footerHeight : 0) }}>{frame(children, true)}</View>
  );
  return (
    <LinearGradient colors={c.gradient as unknown as [string, string, string]} locations={[0, 0.45, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1, backgroundColor: c.paper }}>
      {tabs && scroll ? <PullQuote scrollY={pulled} top={top - 8} fingerDown={zone ? fingerDown : undefined} /> : null}
      {endCap ? (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: uncovered, overflow: 'hidden' }}>
          <View onLayout={(e) => setCapHeight(e.nativeEvent.layout.height)} style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>{endCap}</View>
        </Animated.View>
      ) : null}
      {body}
      {brand ? <FloatingHeader scrollY={pulled} /> : null}
      {footer ? (
        <View onLayout={(e) => setFooterHeight(Math.ceil(e.nativeEvent.layout.height))} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingLeft: padL, paddingRight: padR, paddingTop: space[3], paddingBottom: insets.bottom + 16, backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.line }}>
          <View style={{ width: '100%', maxWidth: landscape ? layout.barMax : CONTENT_MAX, alignSelf: 'center' }}>{footer}</View>
        </View>
      ) : null}
      {overlay}
    </LinearGradient>
  );
}
