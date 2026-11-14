import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { fixed, radius, type Tone, space, scrim, size } from '@/theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';
import { useAnimatedValue } from './useAnimatedValue';

/** Stop and SOS need a held press so a glove or a bump cannot trigger them (docs/16 §3). A screen reader's double tap cannot hold, so it triggers the same action directly. */
export function HoldButton({ label, icon, color, borderOnly, background, ms = 1000, onComplete, minHeight = 88, row, tone = 'onInk' }: { label: string; icon: LucideIcon; color: string; borderOnly?: boolean; /** The fill behind a `borderOnly` button; clear when not given. */ background?: string; ms?: number; onComplete: () => void; minHeight?: number; /** Icon and label side by side, for the smaller buttons in a row of three. */ row?: boolean; /** The icon's colour: on an outline-only button it must stand out from the screen, not from a filled button. */ tone?: Tone }) {
  const fill = useAnimatedValue(0);
  const [holding, setHolding] = useState(false);
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  // The screen this sits on is often replaced the moment the hold completes (stop leaves /ride/live): a fill update still in
  // flight then targets a view that is gone ("reactTag resolved to view null"). Stopping the animation on unmount ends it.
  useEffect(() => () => { anim.current?.stop(); }, []);
  const start = () => {
    setHolding(true);
    anim.current = Animated.timing(fill, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: false });
    anim.current.start(({ finished }) => { if (finished) { setHolding(false); fill.setValue(0); onComplete(); } });
  };
  const cancel = () => { anim.current?.stop(); fill.setValue(0); setHolding(false); };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}, press and hold`} accessibilityHint={`Hold for ${ms / 1000} seconds`} accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === 'activate') onComplete(); }} onPressIn={start} onPressOut={cancel}
      style={{ minHeight, borderRadius: radius.control, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', gap: space[2], backgroundColor: borderOnly ? background ?? 'transparent' : color, borderWidth: borderOnly ? size.outline : 0, borderColor: color, flex: 1 }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: scrim.hold, width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
      <View style={{ alignItems: 'center', gap: row ? space[3] : space[2], flexDirection: row ? 'row' : 'column' }}>
        <Icon icon={icon} size={row ? 22 : 26} tone={tone} color={borderOnly ? undefined : fixed.white} />
        <Text variant={row ? 'bodyMedium' : 'labelMedium'} style={{ color: borderOnly ? color : fixed.white }}>{holding ? (row ? 'Hold…' : 'Keep holding') : label}</Text>
      </View>
    </Pressable>
  );
}
