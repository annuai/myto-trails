import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';

/** One big decision per screen: eyebrow, headline, then whatever supports it. */
export function HeroCard({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <Card style={{ padding: 24, gap: 14 }}>
      <View style={{ gap: 6 }}>
        <Text variant="label" tone="muted">{eyebrow}</Text>
        <Text variant="hero">{title}</Text>
      </View>
      {children}
    </Card>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max ? Math.min(1, value / max) : 0;
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max, now: value }} style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(128,128,128,0.25)', overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 4, backgroundColor: '#1a1a1a' }} />
    </View>
  );
}
