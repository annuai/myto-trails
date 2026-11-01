import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { segmentFrame } from '@/lib/segments';
import { radius, size } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { EASE, ScalePressable, useReducedMotion } from './motion';
import { segmentedTabs } from './SegmentedTabs.tokens';
import { Text } from './Text';
import { useAnimatedValue } from './useAnimatedValue';

export type SegmentedTab<T extends string> = { key: T; label: string };

/**
 * Switches between a few views of one screen, such as Clubs and Rides. A full-width pill on the raised surface with an ink
 * indicator that slides under the chosen tab, the same ink fill a selected chip has. Two to four short labels; each tab is a
 * full-size touch target. For moving between the app's main areas use the tab bar, not this.
 */
export function SegmentedTabs<T extends string>({ tabs, value, onChange, label }: { tabs: SegmentedTab<T>[]; value: T; onChange: (key: T) => void; /** Read out for the whole group, e.g. "Clubs or rides". */ label: string }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const x = useAnimatedValue(0);
  const index = Math.max(0, tabs.findIndex((t) => t.key === value));
  const frame = segmentFrame(index, tabs.length, width, segmentedTabs.pad);
  const placed = useRef(false);
  useEffect(() => {
    // The first time the track is measured the indicator is put straight under the chosen tab; later changes slide.
    if (reduced || !placed.current) { x.setValue(frame.x); placed.current = width > 0; }
    else Animated.timing(x, { toValue: frame.x, duration: segmentedTabs.ms, easing: EASE, useNativeDriver: true }).start();
  }, [x, frame.x, width, reduced]);
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', padding: segmentedTabs.pad, borderRadius: radius.chip, backgroundColor: c.raised }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: segmentedTabs.pad, left: 0, width: frame.width, height: size.target, borderRadius: radius.chip, backgroundColor: c.ink, transform: [{ translateX: x }] }} />
      {tabs.map((t, i) => {
        const on = t.key === value;
        // The label turns light as the indicator arrives under it and dark as it leaves, so it is never light on the page or dark on the ink.
        const at = frame.width > 0 ? x.interpolate({ inputRange: [segmentedTabs.pad + (i - 1) * frame.width, segmentedTabs.pad + i * frame.width, segmentedTabs.pad + (i + 1) * frame.width], outputRange: [0, 1, 0], extrapolate: 'clamp' }) : on ? 1 : 0;
        const away = frame.width > 0 ? Animated.subtract(1, at as Animated.AnimatedInterpolation<number>) : on ? 0 : 1;
        return (
          <ScalePressable key={t.key} scaleTo={0.97} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: on }} onPress={() => { if (!on) onChange(t.key); }}
            style={{ flex: 1, height: size.target, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{ opacity: away }}><Text variant="labelMedium" tone="ink">{t.label}</Text></Animated.View>
            <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', opacity: at }]}><Text variant="labelMedium" tone="onInk">{t.label}</Text></Animated.View>
          </ScalePressable>
        );
      })}
    </View>
  );
}
