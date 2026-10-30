import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fadeTarget, isTap, touchPoint } from '@/lib/tabFade';
import { useTheme } from '@/theme/ThemeProvider';
import { size, space, layout } from '@/theme/tokens';
import { FloatingHeader, HEADER_HEIGHT } from './FloatingHeader';
import { PullQuote } from './PullQuote';
import { EASE, Reveal } from './motion';
import { tabBarFade } from './tabBarFade';
import { CONTENT_MAX, useLayout } from './useLayout';

export const TAB_BAR_HEIGHT = 100;
export const TAB_BAR_HEIGHT_LANDSCAPE = 84;
export { CONTENT_MAX };

type Props = { children: ReactNode; overlay?: ReactNode; tabs?: boolean; scroll?: boolean; footer?: ReactNode; /** Fixed logo and notifications bar that floats as a pill once the page scrolls. */ brand?: boolean; /** The floating tab bar fades away near the end of the page and returns on scrolling up or a tap. */ fadeTabs?: boolean; /** A full-width picture fixed to the bottom edge of the screen. It stays put while the page scrolls; at the very end the content slides up and uncovers it. */ endCap?: ReactNode };

/** Page frame: safe-area top, 20 px side margins, scrolls, leaves room for the tab bar. */
export function Screen({ children, overlay, tabs = false, scroll = true, footer, brand = false, fadeTabs = false, endCap }: Props) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const bar = useRef({ prevY: 0, content: 0, layout: 0, value: 1, touch: null as { x: number; y: number } | null }).current;
  /** Height of the fixed end picture, and the page's own size: together they say how much of the picture the content has uncovered. */
  const [capHeight, setCapHeight] = useState(0);
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
  const bottom = (tabs ? (landscape ? TAB_BAR_HEIGHT_LANDSCAPE : TAB_BAR_HEIGHT) + 24 : insets.bottom + 24) + (footer ? 88 : 0);
  const frame = (kids: ReactNode, fill = false) => <Reveal style={{ width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', flex: fill ? 1 : undefined }}>{kids}</Reveal>;
  const top = insets.top + 8 + (brand ? HEADER_HEIGHT + 8 : 0);
  // The picture is uncovered from the bottom up as the page reaches its end: nothing until the transparent space after the content
  // starts to enter the screen, all of it when the page can scroll no further. Bounce past the end changes nothing.
  const maxY = Math.max(0, page.content - page.layout);
  const measured = capHeight > 0 && page.content > 0 && page.layout > 0;
  const uncovered = measured ? scrollY.interpolate({ inputRange: [maxY - capHeight, maxY], outputRange: [0, capHeight], extrapolate: 'clamp' }) : 0;
  const body = scroll ? (
    <Animated.ScrollView
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: false,
        listener: (e: { nativeEvent: { contentOffset: { y: number } } }) => {
          if (!fadeTabs) return;
          const y = e.nativeEvent.contentOffset.y;
          const next = fadeTarget({ y, prevY: bar.prevY, maxY: Math.max(0, bar.content - bar.layout), current: bar.value });
          bar.prevY = y;
          if (next !== bar.value) setBar(next, next > bar.value);
        },
      })}
      onLayout={fadeTabs || endCap ? (e) => { const h = e.nativeEvent.layout.height; bar.layout = h; if (endCap) setPage((p) => ({ ...p, layout: h })); } : undefined}
      onContentSizeChange={fadeTabs || endCap ? (_w, h) => { bar.content = h; if (endCap) setPage((p) => ({ ...p, content: h })); } : undefined}
      onTouchStart={fadeTabs ? (e) => { bar.touch = touchPoint(e.nativeEvent); } : undefined}
      onTouchEnd={fadeTabs ? (e) => { if (bar.value < 1 && bar.touch && isTap(bar.touch, touchPoint(e.nativeEvent))) setBar(1, true); } : undefined}
      contentContainerStyle={{ paddingTop: top, paddingBottom: endCap ? 0 : bottom, paddingLeft: padL, paddingRight: padR }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {frame(children)}
      {endCap ? <View style={{ height: capHeight }} /> : null}
    </Animated.ScrollView>
  ) : (
    <View style={{ flex: 1, paddingTop: top, paddingLeft: padL, paddingRight: padR, paddingBottom: insets.bottom + 16 }}>{frame(children, true)}</View>
  );
  return (
    <LinearGradient colors={c.gradient as unknown as [string, string, string]} locations={[0, 0.45, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1, backgroundColor: c.paper }}>
      {tabs && scroll ? <PullQuote scrollY={scrollY} top={top - 8} /> : null}
      {endCap ? (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: uncovered, overflow: 'hidden' }}>
          <View onLayout={(e) => setCapHeight(e.nativeEvent.layout.height)} style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>{endCap}</View>
        </Animated.View>
      ) : null}
      {body}
      {brand ? <FloatingHeader scrollY={scrollY} /> : null}
      {footer ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingLeft: padL, paddingRight: padR, paddingTop: space[3], paddingBottom: insets.bottom + 16, backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.line }}>
          <View style={{ width: '100%', maxWidth: landscape ? layout.barMax : CONTENT_MAX, alignSelf: 'center' }}>{footer}</View>
        </View>
      ) : null}
      {overlay}
    </LinearGradient>
  );
}
