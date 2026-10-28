import { useRef, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { size } from '@/theme/tokens';
import { FloatingHeader, HEADER_HEIGHT } from './FloatingHeader';
import { PullQuote } from './PullQuote';
import { Reveal } from './motion';
import { CONTENT_MAX, useLayout } from './useLayout';

export const TAB_BAR_HEIGHT = 100;
export const TAB_BAR_HEIGHT_LANDSCAPE = 84;
export { CONTENT_MAX };

type Props = { children: ReactNode; overlay?: ReactNode; tabs?: boolean; scroll?: boolean; footer?: ReactNode; /** Fixed logo and notifications bar that floats as a pill once the page scrolls. */ brand?: boolean };

/** Page frame: safe-area top, 20 px side margins, scrolls, leaves room for the tab bar. */
export function Screen({ children, overlay, tabs = false, scroll = true, footer, brand = false }: Props) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { landscape } = useLayout();
  // Keep clear of the notch and rounded corners when the phone is turned.
  const padL = Math.max(size.screenX, insets.left + 12), padR = Math.max(size.screenX, insets.right + 12);
  const bottom = (tabs ? (landscape ? TAB_BAR_HEIGHT_LANDSCAPE : TAB_BAR_HEIGHT) + 24 : insets.bottom + 24) + (footer ? 88 : 0);
  const frame = (kids: ReactNode, fill = false) => <Reveal style={{ width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', flex: fill ? 1 : undefined }}>{kids}</Reveal>;
  const top = insets.top + 8 + (brand ? HEADER_HEIGHT + 8 : 0);
  const body = scroll ? (
    <Animated.ScrollView
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      contentContainerStyle={{ paddingTop: top, paddingBottom: bottom, paddingLeft: padL, paddingRight: padR }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {frame(children)}
    </Animated.ScrollView>
  ) : (
    <View style={{ flex: 1, paddingTop: top, paddingLeft: padL, paddingRight: padR, paddingBottom: insets.bottom + 16 }}>{frame(children, true)}</View>
  );
  return (
    <LinearGradient colors={c.gradient as unknown as [string, string, string]} locations={[0, 0.45, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1, backgroundColor: c.paper }}>
      {tabs && scroll ? <PullQuote scrollY={scrollY} top={top - 8} /> : null}
      {body}
      {brand ? <FloatingHeader scrollY={scrollY} /> : null}
      {footer ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingLeft: padL, paddingRight: padR, paddingTop: 12, paddingBottom: insets.bottom + 16, backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.line }}>
          <View style={{ width: '100%', maxWidth: landscape ? 520 : CONTENT_MAX, alignSelf: 'center' }}>{footer}</View>
        </View>
      ) : null}
      {overlay}
    </LinearGradient>
  );
}
