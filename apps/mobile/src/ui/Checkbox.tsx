import { useEffect } from 'react';
import { Animated, View } from 'react-native';
import { buzz } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { motion, size } from '@/theme/tokens';
import { DrawnCheck } from './DrawnCheck';
import { InkFill } from './InkFill';
import { ARRIVE, ScalePressable, useReducedMotion } from './motion';
import { useAnimatedValue } from './useAnimatedValue';
import { checkbox } from './Checkbox.tokens';

/** 28 px box inside a 48 px target. Ticking fills the box and draws the check, with a soft tick; unticking is instant and silent. */
export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const fill = useAnimatedValue(checked ? 1 : 0);
  useEffect(() => {
    if (reduced || !checked) { fill.setValue(checked ? 1 : 0); return; }
    fill.setValue(0);
    Animated.timing(fill, { toValue: 1, duration: motion.duration.quick, easing: ARRIVE, useNativeDriver: true }).start();
  }, [checked, reduced, fill]);
  const press = () => { if (!checked) buzz.tick(); onChange(!checked); };
  return (
    <ScalePressable scaleTo={0.9} accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked }} onPress={press} style={{ width: size.target, height: size.target, alignItems: 'center', justifyContent: 'center' }}>
      {checked ? (
        <Animated.View style={{ opacity: fill, transform: [{ scale: fill.interpolate({ inputRange: [0, 1], outputRange: [checkbox.tick.from, 1] }) }] }}>
          <InkFill style={{ width: checkbox.box, height: checkbox.box, borderRadius: checkbox.radius, alignItems: 'center', justifyContent: 'center' }}>
            <DrawnCheck on color={c.onInk} size={checkbox.tick.size} stroke={checkbox.tick.stroke} />
          </InkFill>
        </Animated.View>
      ) : (
        <View style={{ width: checkbox.box, height: checkbox.box, borderRadius: checkbox.radius, borderWidth: size.rule, borderColor: c.muted }} />
      )}
    </ScalePressable>
  );
}
