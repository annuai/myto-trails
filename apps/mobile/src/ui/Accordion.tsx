import { useEffect, useState, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, size } from '@/theme/tokens';
import { accordion } from './Accordion.tokens';
import { Icon } from './Icon';
import { Text } from './Text';
import { EASE, ScalePressable, useReducedMotion } from './motion';
import { useAnimatedValue } from './useAnimatedValue';

/**
 * One section that opens and closes: a card whose head shows a picture, a title and a short line, and whose body slides open.
 * It holds no state of its own: the screen says which item is open, so it can keep just one open. Closed by default; read aloud as a
 * button that is expanded or collapsed; the chevron turns and the body moves over 300 ms, or at once when the phone asks for less motion.
 */
export function AccordionItem({ title, subtitle, leading, open, onToggle, children }: { title: string; subtitle?: string; leading?: ReactNode; open: boolean; onToggle: () => void; children: ReactNode }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const height = useAnimatedValue(0);
  const turn = useAnimatedValue(open ? 1 : 0);
  const [content, setContent] = useState(0);
  useEffect(() => {
    const to = open ? content : 0;
    if (reduced) { height.setValue(to); turn.setValue(open ? 1 : 0); return; }
    Animated.timing(height, { toValue: to, duration: accordion.durationMs, easing: EASE, useNativeDriver: false }).start();
    Animated.timing(turn, { toValue: open ? 1 : 0, duration: accordion.durationMs, easing: EASE, useNativeDriver: true }).start();
  }, [open, content, reduced, height, turn]);
  return (
    <View style={{ backgroundColor: c.card, borderRadius: radius.card, overflow: 'hidden' }}>
      <ScalePressable
        scaleTo={0.99}
        accessibilityRole="button"
        accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={{ minHeight: size.rowTall, flexDirection: 'row', alignItems: 'center', gap: space[4], paddingVertical: space[3], paddingHorizontal: space[3] }}
      >
        {leading}
        <View style={{ flex: 1, gap: space.half }}>
          <Text variant="bodyMedium">{title}</Text>
          {subtitle ? <Text variant="label" tone="muted">{subtitle}</Text> : null}
        </View>
        <Animated.View style={{ transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${accordion.turn}deg`] }) }] }}>
          <Icon icon={ChevronDown} size={22} tone="muted" />
        </Animated.View>
      </ScalePressable>
      <Animated.View style={{ height, overflow: 'hidden' }} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}>
        <View onLayout={(e) => setContent(e.nativeEvent.layout.height)} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}
