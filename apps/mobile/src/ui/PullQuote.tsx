import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { opacity, radius, space } from '@/theme/tokens';
import { useQuotes } from '@/store/quotes';
import { pullQuote } from './PullQuote.tokens';
import { Text } from './Text';

/**
 * Like Slack: pulling down past the top of the page opens a slightly darker strip above the content with one line,
 * and it closes again when let go. A new line is taken each time the page is pulled down.
 */
export function PullQuote({ scrollY, top }: { scrollY: Animated.Value; top: number }) {
  const { c } = useTheme();
  const [line, setLine] = useState('');
  const pulling = useRef(false);

  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      if (value < -pullQuote.trigger && !pulling.current) { pulling.current = true; setLine(useQuotes.getState().next()); }
      else if (value >= 0) pulling.current = false;
    });
    return () => scrollY.removeListener(id);
  }, [scrollY]);

  const open = scrollY.interpolate({ inputRange: [-pullQuote.open * 2, 0], outputRange: [pullQuote.open * 2, 0], extrapolate: 'clamp' });
  const textOpacity = scrollY.interpolate({ inputRange: [-pullQuote.open, -pullQuote.textAt, 0], outputRange: [1, 0, 0], extrapolate: 'clamp' });
  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: pullQuote.inset, right: pullQuote.inset, top, height: open, borderRadius: radius.card, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.ink, opacity: opacity.overlay }} />
      <Animated.View style={{ height: pullQuote.open - pullQuote.textInset, paddingHorizontal: space[6], alignItems: 'center', justifyContent: 'center', opacity: textOpacity }}>
        <Text variant="label" tone="muted" style={{ textAlign: 'center' }}>{line}</Text>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Android's version. The screen cannot be stretched past its top there, so the pull comes from the system's own pull-to-refresh and this
 * strip slides open over the same line, holds a moment, and closes. `height` is also the spacer that pushes the page down while it is open.
 */
export function QuoteStrip({ open, height, top, onClosed }: { open: boolean; height: Animated.Value; top: number; onClosed: () => void }) {
  const { c } = useTheme();
  const [line, setLine] = useState('');
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new line is taken each time the strip opens
    setLine(useQuotes.getState().next());
    const run = Animated.sequence([
      Animated.timing(height, { toValue: pullQuote.open, duration: pullQuote.slide, useNativeDriver: false }),
      Animated.delay(pullQuote.hold),
      Animated.timing(height, { toValue: 0, duration: pullQuote.slide, useNativeDriver: false }),
    ]);
    run.start(({ finished }) => { if (finished) onClosed(); });
    return () => run.stop();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: pullQuote.inset, right: pullQuote.inset, top, height, borderRadius: radius.card, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.ink, opacity: opacity.overlay }} />
      <View style={{ height: pullQuote.open - pullQuote.textInset, paddingHorizontal: space[6], alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="label" tone="muted" style={{ textAlign: 'center' }}>{line}</Text>
      </View>
    </Animated.View>
  );
}
