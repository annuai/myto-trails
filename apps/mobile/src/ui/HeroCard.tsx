import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from './Card';
import { EASE } from './motion';
import { Text } from './Text';

import { space, radius, scrim } from '@/theme/tokens';
import { heroCard } from './HeroCard.tokens';
/** One big decision per screen: eyebrow, headline, then whatever supports it. */
export function HeroCard({ eyebrow, title, children, action }: { eyebrow: string; title: string; children?: ReactNode; /** A control pinned to the top right, such as a menu button. */ action?: ReactNode }) {
  return (
    <Card style={{ padding: space[6], gap: space[4] }}>
      {action ? <View style={{ position: 'absolute', top: space[3], right: space[3], zIndex: 1 }}>{action}</View> : null}
      <View style={{ gap: space[2], paddingRight: action ? heroCard.actionRoom : 0 }}>
        <Text variant="label" tone="muted">{eyebrow}</Text>
        <Text variant="hero">{title}</Text>
      </View>
      {children}
    </Card>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const { c } = useTheme();
  const pct = max ? Math.min(1, value / max) : 0;
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(w, { toValue: pct, duration: 500, easing: EASE, useNativeDriver: false }).start(); }, [pct, w]);
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max, now: value }} style={{ height: heroCard.track, borderRadius: radius.chip, backgroundColor: scrim.track, overflow: 'hidden' }}>
      <Animated.View style={{ width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), height: '100%', borderRadius: radius.chip, backgroundColor: c.ink }} />
    </View>
  );
}
