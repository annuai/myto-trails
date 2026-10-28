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
