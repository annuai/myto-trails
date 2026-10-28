import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { useQuotes } from '@/store/quotes';
import { Text } from './Text';

const FULL = 96; // pull distance at which the strip is fully open
const TEXT_AT = 28; // the line fades in once the strip is this open

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
      if (value < -6 && !pulling.current) { pulling.current = true; setLine(useQuotes.getState().next()); }
      else if (value >= 0) pulling.current = false;
    });
    return () => scrollY.removeListener(id);
  }, [scrollY]);

  const open = scrollY.interpolate({ inputRange: [-FULL * 2, 0], outputRange: [FULL * 2, 0], extrapolate: 'clamp' });
  const textOpacity = scrollY.interpolate({ inputRange: [-FULL, -TEXT_AT, 0], outputRange: [1, 0, 0], extrapolate: 'clamp' });
  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: 20, right: 20, top, height: open, borderRadius: radius.card, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.ink, opacity: 0.07 }} />
      <Animated.View style={{ height: FULL - 20, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', opacity: textOpacity }}>
        <Text variant="label" tone="muted" style={{ textAlign: 'center' }}>{line}</Text>
      </Animated.View>
    </Animated.View>
  );
}
