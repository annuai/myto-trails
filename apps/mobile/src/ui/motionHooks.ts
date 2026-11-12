import { useEffect, useRef, useState } from 'react';
import { Easing } from 'react-native';
import { rollTicks } from '@/lib/haptics';
import { rollTickTimes } from '@/lib/feedbackPlan';
import { isNew, useSeen } from '@/store/seen';
import { motion } from '@/theme/tokens';
import { useReducedMotion } from './motion';

const arrive = Easing.bezier(...motion.ease.arrive);
const standard = Easing.bezier(...motion.ease.standard);
export const easeFns = { arrive, standard } as const;
const FRAME_MS = 33;

/**
 * Whether a moment should play now: true the first time `id` is seen, false on every later visit and while `id` is undefined.
 * Decided once, on the first draw, and marked as played straight away, so leaving halfway still counts as seen.
 */
export function useOnce(id: string | undefined): boolean {
  const [play] = useState(() => !!id && isNew(id));
  useEffect(() => { if (play && id) useSeen.getState().mark(id); }, [play, id]);
  return play;
}

/**
 * Progress from 0 to 1 over `ms`, redrawn about 30 times a second (it drives a map line or a number, which cannot use the native driver).
 * 1 straight away when `play` is false or the phone asks for reduced motion. Bump `run` to play it again.
 */
export function useProgress(play: boolean, ms: number, o: { delay?: number; run?: number; ease?: keyof typeof easeFns } = {}): number {
  const reduced = useReducedMotion();
  const animate = play && !reduced;
  const ease = easeFns[o.ease ?? 'arrive'];
  // The state carries the key of the play it belongs to, so starting a new play (or a first one) reads as 0 at once, with no setState in an effect.
  const key = `${o.run ?? 0}:${animate ? 1 : 0}`;
  const [state, setState] = useState({ key, p: 0 });
  const last = useRef(0);
  useEffect(() => {
    if (!animate) return;
    let raf = 0;
    const begin = performance.now() + (o.delay ?? 0);
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - begin) / ms));
      if (t >= 1) { setState({ key, p: 1 }); return; }
      if (now - last.current >= FRAME_MS) { last.current = now; setState({ key, p: ease(t) }); }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [animate, ms, o.delay, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return !animate ? 1 : state.key === key ? state.p : 0;
}

/**
 * A number counting up to `target`, with a soft detent as it rolls (see `rollTickTimes`). `target` itself when not playing.
 * `steps` is how many different values the eye will see, which sets how many ticks it gets.
 */
export function useCountUp(target: number, play: boolean, o: { ms?: number; delay?: number; run?: number; steps?: number } = {}): number {
  const ms = o.ms ?? motion.duration.scene;
  const reduced = useReducedMotion();
  const p = useProgress(play, ms, { delay: o.delay, run: o.run });
  useEffect(() => {
    if (!play || reduced) return;
    const times = rollTickTimes(o.steps ?? Math.round(Math.abs(target)), ms, motion.rollTickGap).map((t) => t + (o.delay ?? 0));
    return rollTicks(times);
  }, [play, reduced, target, ms, o.delay, o.run, o.steps]);
  return target * p;
}
