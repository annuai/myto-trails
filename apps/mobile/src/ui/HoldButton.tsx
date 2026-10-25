import { useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { fixed, radius } from '@/theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';

/** Stop and SOS need a held press so a glove or a bump cannot trigger them (docs/16 §3). */
export function HoldButton({ label, icon, color, borderOnly, ms = 1000, onComplete, minHeight = 88 }: { label: string; icon: LucideIcon; color: string; borderOnly?: boolean; ms?: number; onComplete: () => void; minHeight?: number }) {
  const fill = useRef(new Animated.Value(0)).current;
  const [holding, setHolding] = useState(false);
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const start = () => {
    setHolding(true);
    anim.current = Animated.timing(fill, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: false });
    anim.current.start(({ finished }) => { if (finished) { setHolding(false); fill.setValue(0); onComplete(); } });
  };
  const cancel = () => { anim.current?.stop(); fill.setValue(0); setHolding(false); };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}, press and hold`} accessibilityHint={`Hold for ${ms / 1000} seconds`} onPressIn={start} onPressOut={cancel}
      style={{ minHeight, borderRadius: radius.control, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: borderOnly ? 'transparent' : color, borderWidth: borderOnly ? 1.5 : 0, borderColor: color, flex: 1 }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.28)', width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Icon icon={icon} size={26} tone="onInk" />
        <Text variant="labelMedium" style={{ color: fixed.white }}>{holding ? 'Keep holding' : label}</Text>
      </View>
    </Pressable>
  );
}
