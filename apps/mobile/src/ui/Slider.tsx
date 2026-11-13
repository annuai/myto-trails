import { useMemo, useState } from 'react';
import { PanResponder, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLatest } from '@/lib/useLatest';
import { radius } from '@/theme/tokens';
import { slider } from './Slider.tokens';

/** A 0 to 1 slider: drag anywhere on it, or use the accessibility increment and decrement actions. */
export function Slider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const at = useLatest((x: number) => onChange(Math.min(1, Math.max(0, x / Math.max(1, width)))));
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => at(e.nativeEvent.locationX),
    onPanResponderMove: (e) => at(e.nativeEvent.locationX),
  }), [at]);
  const pct = Math.round(value * 100);
  return (
    <View
      accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: pct }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.min(1, Math.max(0, value + (e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1))))}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: slider.hit, justifyContent: 'center' }}
      {...pan.panHandlers}
    >
      <View pointerEvents="none" style={{ height: slider.track, borderRadius: radius.chip, backgroundColor: c.line }}>
        <View style={{ width: `${pct}%`, height: slider.track, borderRadius: radius.chip, backgroundColor: c.accent }} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: Math.max(0, Math.min(width - slider.thumb, value * width - slider.thumb / 2)), width: slider.thumb, height: slider.thumb, borderRadius: radius.chip, backgroundColor: c.accent }} />
    </View>
  );
}
