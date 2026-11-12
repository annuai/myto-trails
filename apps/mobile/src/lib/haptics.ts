import { Platform, Vibration } from 'react-native';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import { useAppearance } from '@/store/appearance';
import { enginePattern } from './buzzPlan';
import { ANDROID_BUZZ, tickDue } from './feedbackPlan';
import { motion } from '@/theme/tokens';

const hapticsOn = () => useAppearance.getState().haptics;
const speedTicksOn = () => hapticsOn() && useAppearance.getState().speedTicks;

/**
 * Runs one haptic, unless the rider switched them off. Never throws: a phone without a motor just stays quiet.
 * On Android the explicit vibration `pattern` is used instead, because its haptic effects are too faint to feel on many phones.
 */
const quiet = (ios: () => Promise<void>, pattern?: readonly number[]) => {
  if (!hapticsOn()) return;
  if (Platform.OS === 'android' && pattern) { Vibration.vibrate([...pattern]); return; }
  ios().catch(() => undefined);
};

let lastDetentAt = 0;
/** A detent while a number rolls: rate limited, so a fast roll is a ratchet and not one long buzz. */
const detent = (ios: () => Promise<void>, pattern: readonly number[]) => {
  const now = Date.now();
  if (!tickDue(lastDetentAt, now, motion.rollTickGap)) return;
  lastDetentAt = now;
  quiet(ios, pattern);
};

/**
 * A distinct buzz per thing that happened, so a rider in gloves can tell what a press did without looking:
 * `tick` a choice changed, `confirm` a task finished, `settle` something landed, `milestone` a mark was earned,
 * `help` a problem needs attention, and `roll` / `speed` the detents of a number or the live speedometer moving.
 */
export const buzz = {
  pause: () => quiet(() => impactAsync(ImpactFeedbackStyle.Medium)),
  resume: () => quiet(() => notificationAsync(NotificationFeedbackType.Success)),
  waypoint: () => quiet(() => impactAsync(ImpactFeedbackStyle.Light)),
  help: () => quiet(() => notificationAsync(NotificationFeedbackType.Warning)),
  /** One soft tick as a wheel settles on a new value, or a check changes. */
  tick: () => quiet(() => selectionAsync(), ANDROID_BUZZ.tick),
  /** A task finished: a ride saved, a service logged, a list all clear. */
  confirm: () => quiet(() => notificationAsync(NotificationFeedbackType.Success), ANDROID_BUZZ.confirm),
  /** Something landed: an odometer, a stamp. */
  settle: () => quiet(() => impactAsync(ImpactFeedbackStyle.Medium), ANDROID_BUZZ.settle),
  /** A mark was earned: a settle, then a confirm a moment after. Rare. */
  milestone: () => {
    if (!hapticsOn()) return;
    if (Platform.OS === 'android') { Vibration.vibrate([...ANDROID_BUZZ.milestone]); return; }
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => undefined);
    setTimeout(() => notificationAsync(NotificationFeedbackType.Success).catch(() => undefined), 120);
  },
  /** One detent of a number rolling (a count-up, an odometer digit). */
  roll: () => detent(() => selectionAsync(), ANDROID_BUZZ.detent),
  /** One detent of the live speedometer passing a band edge. Off when the rider turned speed ticks off. */
  speed: () => { if (speedTicksOn()) detent(() => impactAsync(ImpactFeedbackStyle.Light), ANDROID_BUZZ.detent); },
  /** The bike setting off on a long pull-down, and the light taps of its engine while it rides. */
  rev: () => quiet(() => impactAsync(ImpactFeedbackStyle.Heavy)),
  rumble: () => quiet(() => impactAsync(ImpactFeedbackStyle.Light)),
  /** A new way was found after the rider left the road. */
  reroute: () => quiet(() => impactAsync(ImpactFeedbackStyle.Medium)),
  stop: () => quiet(() => impactAsync(ImpactFeedbackStyle.Heavy)),
};

/** The ticks of a number rolling over `ms`, at the times in `at` (see `rollTickTimes`); returns a function that cancels the rest. */
export function rollTicks(at: number[]): () => void {
  const ids = at.map((t) => setTimeout(buzz.roll, t));
  return () => ids.forEach(clearTimeout);
}

/**
 * The bike's engine for `totalMs`; returns a function that stops it. Android's haptic effects are too faint to feel on many phones, so
 * it gets one explicit vibration pattern; iPhone gets a firm tap and then light taps.
 */
export function startEngine(totalMs: number, tapEveryMs: number): () => void {
  if (Platform.OS === 'android') {
    if (hapticsOn()) Vibration.vibrate(enginePattern(totalMs));
    return () => Vibration.cancel();
  }
  buzz.rev();
  const id = setInterval(buzz.rumble, tapEveryMs);
  return () => clearInterval(id);
}
