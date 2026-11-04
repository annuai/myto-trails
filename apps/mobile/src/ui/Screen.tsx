import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, RefreshControl, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fadeTarget, isTap, touchPoint } from '@/lib/tabFade';
import { useTheme } from '@/theme/ThemeProvider';
import { size, space, layout } from '@/theme/tokens';
import { FloatingHeader, HEADER_HEIGHT } from './FloatingHeader';
import { PullBike } from './PullBike';
import { PullQuote, QuoteStrip } from './PullQuote';
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
  /** Android cannot stretch the page past its top, so the bike reads the finger instead: how far it has dragged down from where it touched, as a negative number like a stretched page, while the page is at its top. */
  const pull = useAnimatedValue(0);
  const drag = useRef({ offset: 0, startY: null as number | null }).current;
  /** Height of the fixed end picture, and the page's own size: together they say how much of the picture the content has uncovered. */
  /** Android: the pull-down line is opened by the system's pull-to-refresh, since the page cannot be stretched past its top there. */
  const [quoting, setQuoting] = useState(false);
  const quoteHeight = useAnimatedValue(0);
  const [capHeight, setCapHeight] = useState(0);
  /** A footer's own height, so a tall one never covers the end of the page. */
  const [footerHeight, setFooterHeight] = useState(88);
  const [page, setPage] = useState({ content: 0, layout: 0 });
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
  // The picture is uncovered from the bottom up as the page reaches its end: nothing until the transparent space after the content
  // starts to enter the screen, all of it when the page can scroll no further. Bounce past the end changes nothing.
  const maxY = Math.max(0, page.content - page.layout);
  const measured = capHeight > 0 && page.content > 0 && page.layout > 0;
  const uncovered = measured ? scrollY.interpolate({ inputRange: [maxY - capHeight, maxY], outputRange: [0, capHeight], extrapolate: 'clamp' }) : 0;
  /** The scroll handler is made once; `useLatest` keeps it reading the current props. */
  const onScrollEvent = useLatest((e: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    drag.offset = contentOffset.y;
    if (onNearEnd && contentSize.height - (contentOffset.y + layoutMeasurement.height) < layoutMeasurement.height) onNearEnd();
    if (!fadeTabs) return;
    const y = e.nativeEvent.contentOffset.y;
    const next = fadeTarget({ y, prevY: bar.prevY, maxY: Math.max(0, bar.content - bar.layout), current: bar.value });
    bar.prevY = y;
    if (next !== bar.value) setBar(next, next > bar.value);
  });
  const androidQuote = Platform.OS === 'android' && tabs && scroll;
  const bikeAndroid = bike && Platform.OS === 'android';
  const body = scroll ? (
    <Animated.ScrollView
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false, listener: onScrollEvent })}
      onLayout={fadeTabs || endCap || onNearEnd ? (e) => { const h = e.nativeEvent.layout.height; bar.layout = h; if (endCap) setPage((p) => ({ ...p, layout: h })); } : undefined}
      onContentSizeChange={fadeTabs || endCap || onNearEnd ? (_w, h) => { bar.content = h; if (endCap) setPage((p) => ({ ...p, content: h })); if (onNearEnd && bar.layout > 0 && h < bar.layout * 2) onNearEnd(); } : undefined}
      onTouchStart={fadeTabs || bikeAndroid ? (e) => { if (fadeTabs) bar.touch = touchPoint(e.nativeEvent); if (bikeAndroid) drag.startY = drag.offset <= 0 ? e.nativeEvent.pageY : null; } : undefined}
      onTouchMove={bikeAndroid ? (e) => { if (drag.startY !== null) pull.setValue(-Math.max(0, e.nativeEvent.pageY - drag.startY)); } : undefined}
      onTouchEnd={fadeTabs || bikeAndroid ? (e) => { if (fadeTabs && bar.value < 1 && bar.touch && isTap(bar.touch, touchPoint(e.nativeEvent))) setBar(1, true); if (bikeAndroid) { drag.startY = null; pull.setValue(0); } } : undefined}
      onTouchCancel={bikeAndroid ? () => { drag.startY = null; pull.setValue(0); } : undefined}
      contentContainerStyle={{ paddingTop: top, paddingBottom: endCap ? 0 : bottom, paddingLeft: padL, paddingRight: padR }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={androidQuote ? <RefreshControl refreshing={false} onRefresh={() => setQuoting(true)} progressViewOffset={top} colors={[c.accent]} progressBackgroundColor={c.card} /> : undefined}
    >
      {androidQuote ? <Animated.View style={{ height: quoteHeight }} /> : null}
      {bike ? <PullBike scrollY={Platform.OS === 'android' ? pull : scrollY} baseline={top} /> : null}
      {frame(children)}
      {endCap ? <View style={{ height: capHeight }} /> : null}
    </Animated.ScrollView>
  ) : (
    <View style={{ flex: 1, paddingTop: top, paddingLeft: padL, paddingRight: padR, paddingBottom: insets.bottom + 16 + (footer ? footerHeight : 0) }}>{frame(children, true)}</View>
  );
  return (
    <LinearGradient colors={c.gradient as unknown as [string, string, string]} locations={[0, 0.45, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1, backgroundColor: c.paper }}>
      {tabs && scroll && Platform.OS !== 'android' ? <PullQuote scrollY={scrollY} top={top - 8} /> : null}
      {androidQuote ? <QuoteStrip open={quoting} height={quoteHeight} top={top - 8} onClosed={() => setQuoting(false)} /> : null}
      {endCap ? (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: uncovered, overflow: 'hidden' }}>
          <View onLayout={(e) => setCapHeight(e.nativeEvent.layout.height)} style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>{endCap}</View>
        </Animated.View>
      ) : null}
      {body}
      {brand ? <FloatingHeader scrollY={scrollY} /> : null}
      {footer ? (
        <View onLayout={(e) => setFooterHeight(Math.ceil(e.nativeEvent.layout.height))} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingLeft: padL, paddingRight: padR, paddingTop: space[3], paddingBottom: insets.bottom + 16, backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.line }}>
          <View style={{ width: '100%', maxWidth: landscape ? layout.barMax : CONTENT_MAX, alignSelf: 'center' }}>{footer}</View>
        </View>
      ) : null}
      {overlay}
    </LinearGradient>
  );
}
