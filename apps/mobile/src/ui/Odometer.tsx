import { useEffect, useMemo } from 'react';
import { Animated, View } from 'react-native';
import { rollTicks } from '@/lib/haptics';
import { rollTickTimes } from '@/lib/feedbackPlan';
import { rollPlan, rollSteps } from '@/lib/odometer';
import { useSeen } from '@/store/seen';
import { useTheme } from '@/theme/ThemeProvider';
import { motion, radius, size } from '@/theme/tokens';
import { ARRIVE, useReducedMotion } from './motion';
import { Text } from './Text';
import { useAnimatedValue } from './useAnimatedValue';
import { odometer as k } from './Odometer.tokens';

const RUN = Array.from({ length: k.strip }, (_, i) => i % 10);

function Column({ from, to, play, delay, dim }: { from: number; to: number; play: boolean; delay: number; dim: boolean }) {
  const { c } = useTheme();
  const y = useAnimatedValue(-from * k.height);
  useEffect(() => {
    if (!play) { y.setValue(-(to % 10) * k.height); return; }
    y.setValue(-from * k.height);
    Animated.timing(y, { toValue: -to * k.height, duration: motion.duration.scene, delay, easing: ARRIVE, useNativeDriver: true }).start(() => y.setValue(-(to % 10) * k.height));
  }, [from, to, play, delay, y]);
  return (
    <View style={{ width: k.width, height: k.height, overflow: 'hidden', borderRadius: k.radius, backgroundColor: c.raised, alignItems: 'center' }}>
      <Animated.View style={{ transform: [{ translateY: y }] }}>
        {RUN.map((d, i) => <View key={i} style={{ height: k.height, justifyContent: 'center' }}><Text variant="dataLarge" tone={dim ? 'muted' : 'ink'}>{d}</Text></View>)}
      </Animated.View>
    </View>
  );
}

/**
 * A distance as an odometer: whole kilometres on a row of digit wheels. Opening a screen whose total grew since it was last shown rolls the
 * wheels forward, ones first, with a soft detent as each passes (the haptics are the ratchet of a real one); otherwise it just reads.
 * `id` names the total, so the next visit starts from the figure last shown.
 */
export function Odometer({ id, km, label }: { id: string; km: number; label: string }) {
  const reduced = useReducedMotion();
  const whole = Math.floor(km);
  const plan = useMemo(() => {
    const seen = useSeen.persist.hasHydrated() ? useSeen.getState().last[id] : undefined;
    return rollPlan(seen ?? whole, whole);
  }, [whole, id]);
  const steps = rollSteps(plan);
  const play = steps > 0 && !reduced;
  useEffect(() => {
    useSeen.getState().remember(id, whole);
    if (!play) return;
    return rollTicks(rollTickTimes(steps * plan.length, motion.duration.scene + plan.length * k.stagger, motion.rollTickGap));
  }, [id, whole, play, steps, plan.length]);
  const lead = plan.findIndex((r) => r.to % 10 !== 0 || r.from !== 0);
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`${label}: ${whole.toLocaleString()} kilometres`} style={{ flexDirection: 'row', gap: k.gap }}>
      {plan.map((r, i) => <Column key={i} from={r.from} to={r.to} play={play} delay={(plan.length - 1 - i) * k.stagger} dim={lead >= 0 && i < lead} />)}
    </View>
  );
}
