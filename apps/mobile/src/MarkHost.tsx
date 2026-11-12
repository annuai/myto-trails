import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buzz } from '@/lib/haptics';
import { syncMarks } from '@/lib/markSync';
import { syncStandingWhenReady } from '@/lib/standingSync';
import { markDef } from '@/lib/marks';
import { useMarkToast } from '@/store/markToast';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, motion, radius, shadow, space } from '@/theme/tokens';
import { ARRIVE, EXIT, ScalePressable, useReducedMotion } from '@/ui/motion';
import { Stamp } from '@/ui/Stamp';
import { Text } from '@/ui/Text';
import { useAnimatedValue } from '@/ui/useAnimatedValue';
import { markHost } from './MarkHost.tokens';

/**
 * Stamps a newly earned mark on screen: a quiet card that rises above the tab bar, holds for a few seconds and leaves. It never blocks
 * anything. The first run only records marks the rider had already earned, so nobody is greeted with all of them at once.
 */
export function MarkHost() {
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const queue = useMarkToast((s) => s.queue);
  const [shown, setShown] = useState<string>();
  const enter = useAnimatedValue(0);
  const ring = useAnimatedValue(0);
  const busy = useRef(false);
  useEffect(() => { syncMarks(); return syncStandingWhenReady(); }, []);
  useEffect(() => {
    const id = queue[0];
    if (!id || busy.current) return;
    busy.current = true;
    const wait = setTimeout(() => {
      setShown(id);
      buzz.milestone();
      enter.setValue(0); ring.setValue(0);
      Animated.parallel([
        Animated.timing(enter, { toValue: 1, duration: reduced ? motion.duration.quick : motion.duration.scene, easing: ARRIVE, useNativeDriver: true }),
        ...(reduced ? [] : [Animated.timing(ring, { toValue: 1, duration: motion.duration.slow, easing: ARRIVE, useNativeDriver: true })]),
      ]).start();
      setTimeout(() => {
        Animated.timing(enter, { toValue: 0, duration: motion.duration.base, easing: EXIT, useNativeDriver: true }).start(() => {
          setShown(undefined); useMarkToast.getState().next(); busy.current = false;
        });
      }, motion.markHold);
    }, motion.markDelay);
    return () => clearTimeout(wait);
  }, [queue, enter, ring, reduced]);
  const def = shown ? markDef(shown) : undefined;
  if (!def) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + markHost.bottom, alignItems: 'center', paddingHorizontal: space[4] }}>
      <Animated.View style={{ width: '100%', maxWidth: layout.barMax, opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [markHost.rise, 0] }) }] }}>
        <ScalePressable accessibilityRole="button" accessibilityLabel={`New mark: ${def.title}. Open your marks.`} onPress={() => router.push('/marks')}
          style={{ backgroundColor: c.card, borderRadius: radius.card, padding: space[4], flexDirection: 'row', alignItems: 'center', gap: space[4], ...shadow.bar }}>
          <View style={{ width: markHost.stamp, height: markHost.stamp, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View pointerEvents="none" style={{ position: 'absolute', width: markHost.stamp, height: markHost.stamp, borderRadius: radius.chip, borderWidth: markHost.ringWidth, borderColor: c.accent, opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [markHost.ringFrom, 0] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, markHost.ringTo] }) }] }} />
            <Animated.View style={{ transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [markHost.stampFrom, 1] }) }] }}><Stamp def={def} earned /></Animated.View>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label" tone="muted">New mark</Text>
            <Text variant="bodyMedium">{def.title}</Text>
          </View>
        </ScalePressable>
      </Animated.View>
    </View>
  );
}
