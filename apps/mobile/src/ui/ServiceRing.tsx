import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { Wrench } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { motion } from '@/theme/tokens';
import { DrawnCheck } from './DrawnCheck';
import { Icon } from './Icon';
import { ARRIVE, useReducedMotion } from './motion';
import { useAnimatedValue } from './useAnimatedValue';
import { serviceRing as k, serviceRingLength } from './ServiceRing.tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * How much of a service interval is left, as a ring that drains with use. Calm blue while there is time, amber when little is left, red when it is due.
 * When the item is marked done the ring refills, turns green and draws a check, then settles back to blue.
 */
export function ServiceRing({ left, due, doneAt }: { left: number; due: boolean; /** Changes when the item is marked done; the ring celebrates once per change. */ doneAt?: number }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const arc = useAnimatedValue(left);
  const [good, setGood] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (reduced) { arc.setValue(left); return; }
    Animated.timing(arc, { toValue: left, duration: motion.duration.slow, easing: ARRIVE, useNativeDriver: false }).start();
  }, [left, reduced, arc]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (doneAt === undefined) return;
    const on = setTimeout(() => setGood(true), 0);
    const off = setTimeout(() => setGood(false), motion.doneHold * 2);
    return () => { clearTimeout(on); clearTimeout(off); };
  }, [doneAt]);
  const tone = good ? c.good : due ? c.stop : left <= k.soon ? c.caution : c.accent;
  const mid = k.box / 2;
  return (
    <View style={{ width: k.box, height: k.box, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={k.box} height={k.box} viewBox={`0 0 ${k.box} ${k.box}`} style={{ position: 'absolute' }}>
        <Circle cx={mid} cy={mid} r={k.radius} fill="none" stroke={c.line} strokeWidth={k.stroke} />
        <AnimatedCircle cx={mid} cy={mid} r={k.radius} fill="none" stroke={tone} strokeWidth={k.stroke} strokeLinecap="round" strokeDasharray={serviceRingLength}
          strokeDashoffset={arc.interpolate({ inputRange: [0, 1], outputRange: [serviceRingLength, 0] })} transform={`rotate(-90 ${mid} ${mid})`} />
      </Svg>
      {good ? <DrawnCheck on color={c.good} size={k.check.size} stroke={k.check.stroke} delay={motion.duration.slow} /> : <Icon icon={Wrench} size={k.check.size} tone="muted" />}
    </View>
  );
}
