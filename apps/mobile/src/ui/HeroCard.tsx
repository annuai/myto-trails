import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { Card } from './Card';
import { EASE } from './motion';
import { Text } from './Text';

/** One big decision per screen: eyebrow, headline, then whatever supports it. */
export function HeroCard({ eyebrow, title, children, action }: { eyebrow: string; title: string; children?: ReactNode; /** A control pinned to the top right, such as a menu button. */ action?: ReactNode }) {
  return (
    <Card style={{ padding: 24, gap: 14 }}>
      {action ? <View style={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}>{action}</View> : null}
      <View style={{ gap: 6, paddingRight: action ? 40 : 0 }}>
        <Text variant="label" tone="muted">{eyebrow}</Text>
        <Text variant="hero">{title}</Text>
      </View>
      {children}
    </Card>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max ? Math.min(1, value / max) : 0;
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(w, { toValue: pct, duration: 500, easing: EASE, useNativeDriver: false }).start(); }, [pct, w]);
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max, now: value }} style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(128,128,128,0.25)', overflow: 'hidden' }}>
      <Animated.View style={{ width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), height: '100%', borderRadius: 4, backgroundColor: '#1a1a1a' }} />
    </View>
  );
}
