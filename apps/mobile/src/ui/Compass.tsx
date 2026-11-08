import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { turnTo } from '@/lib/compass';
import { font } from '@/theme/tokens';
import { compass as k } from './Compass.tokens';
import { useAnimatedValue } from './useAnimatedValue';
import { useReducedMotion } from './motion';

const C = k.centre;
const point = (deg: number, r: number) => ({ x: C + r * Math.sin((deg * Math.PI) / 180), y: C - r * Math.cos((deg * Math.PI) / 180) });

/** The dial's angle: it turns against the heading, and takes the short way round north. Holds its last angle while there is no heading. */
function useDialAngle(heading: number | undefined): Animated.AnimatedInterpolation<string> {
  const reduced = useReducedMotion();
  const turn = useAnimatedValue(0);
  const at = useRef(0);
  useEffect(() => {
    if (heading === undefined) return;
    const to = turnTo(at.current, -heading);
    at.current = to;
    if (reduced) turn.setValue(to);
    else Animated.timing(turn, { toValue: to, duration: k.turnMs, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [heading, reduced, turn]);
  return turn.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });
}

const Needle = ({ reach, half }: { reach: number; half: number }) => (
  <>
    <Path d={`M${C} ${C - reach} L${C + half} ${C} L${C - half} ${C} Z`} fill={k.blue} stroke={k.white} strokeWidth={1} strokeLinejoin="round" />
    <Path d={`M${C} ${C + reach} L${C + half} ${C} L${C - half} ${C} Z`} fill={k.white} />
    <Circle cx={C} cy={C} r={k.pivot} fill={k.red} stroke={k.white} strokeWidth={1.5} />
  </>
);

/** Ticks every 15 degrees (longer every 45) and the four letters; N is blue. They turn with the dial. */
function Markings() {
  const r = k.rich;
  const ticks = Array.from({ length: 24 }, (_, i) => i * 15).filter((d) => d % 90 !== 0);
  const letters: [string, number][] = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
  return (
    <>
      {ticks.map((d) => {
        const a = point(d, r.tickOut), b = point(d, d % 45 === 0 ? r.tickMajor : r.tickMinor);
        return <Line key={d} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={k.white} strokeWidth={d % 45 === 0 ? 1.4 : 0.9} strokeOpacity={d % 45 === 0 ? 1 : r.minorOpacity} strokeLinecap="round" />;
      })}
      {letters.map(([l, d]) => {
        const p = point(d, r.letterR);
        return <SvgText key={l} x={p.x} y={p.y} fontSize={r.letterSize} fontFamily={font.semibold} fill={l === 'N' ? k.blue : k.white} textAnchor="middle" alignmentBaseline="central" transform={`rotate(${d} ${p.x} ${p.y})`}>{l}</SvgText>;
      })}
    </>
  );
}

/**
 * The compass: a brand red disc with a white ring, a notch at the top that is straight ahead, and a needle whose blue tip points north, so riding
 * north-east puts the tip off to the left. `rich` is the full-screen dial: the whole dial turns, with N, E, S, W and ticks on it. Without a
 * heading the needle fades and stays where it was.
 */
export function Compass({ heading, size, rich = false }: { heading: number | undefined; size: number; rich?: boolean }) {
  const angle = useDialAngle(heading);
  const notch = rich ? k.notch.rich : k.notch.mini;
  const needle = rich ? k.needle.rich : k.needle.mini;
  const unknown = heading === undefined;
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Svg width={size} height={size} viewBox={`0 0 ${k.grid} ${k.grid}`} style={{ position: 'absolute' }}>
        <Circle cx={C} cy={C} r={k.discR} fill={k.red} />
        <Circle cx={C} cy={C} r={rich ? k.ring.rich : k.ring.r} fill="none" stroke={k.white} strokeOpacity={k.ring.opacity} strokeWidth={k.ring.width} />
        <Path d={`M${C} ${notch.top} L${C + notch.half} ${notch.bottom} L${C - notch.half} ${notch.bottom} Z`} fill={k.white} />
        {rich ? null : k.miniMarks.map((m) => <Rect key={`${m.x}${m.y}`} x={m.x} y={m.y} width={m.w} height={m.h} rx={1} fill={k.white} fillOpacity={k.ring.opacity * 2} />)}
      </Svg>
      <Animated.View style={{ position: 'absolute', width: size, height: size, transform: [{ rotate: angle }] }}>
        <Svg width={size} height={size} viewBox={`0 0 ${k.grid} ${k.grid}`}>
          <G>
            {rich ? <Markings /> : null}
            <G opacity={unknown ? k.unknownOpacity : 1}><Needle reach={needle.reach} half={needle.half} /></G>
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}
