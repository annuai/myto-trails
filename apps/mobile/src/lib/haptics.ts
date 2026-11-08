import { Platform, Vibration } from 'react-native';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import { enginePattern } from './buzzPlan';

/** A distinct buzz per ride action, so a rider in gloves can tell what a press did without looking. Never throws: a phone without a motor just stays quiet. */
const quiet = (p: Promise<void>) => { p.catch(() => undefined); };
export const buzz = {
  pause: () => quiet(impactAsync(ImpactFeedbackStyle.Medium)),
  resume: () => quiet(notificationAsync(NotificationFeedbackType.Success)),
  waypoint: () => quiet(impactAsync(ImpactFeedbackStyle.Light)),
  help: () => quiet(notificationAsync(NotificationFeedbackType.Warning)),
  /** One soft tick as a wheel settles on a new value. */
  tick: () => quiet(selectionAsync()),
  /** The bike setting off on a long pull-down, and the light taps of its engine while it rides. */
  rev: () => quiet(impactAsync(ImpactFeedbackStyle.Heavy)),
  rumble: () => quiet(impactAsync(ImpactFeedbackStyle.Light)),
  /** A new way was found after the rider left the road. */
  reroute: () => quiet(impactAsync(ImpactFeedbackStyle.Medium)),
  stop: () => quiet(impactAsync(ImpactFeedbackStyle.Heavy)),
};

/**
 * The bike's engine for `totalMs`; returns a function that stops it. Android's haptic effects are too faint to feel on many phones, so
 * it gets one explicit vibration pattern; iPhone gets a firm tap and then light taps.
 */
export function startEngine(totalMs: number, tapEveryMs: number): () => void {
  if (Platform.OS === 'android') {
    Vibration.vibrate(enginePattern(totalMs));
    return () => Vibration.cancel();
  }
  buzz.rev();
  const id = setInterval(buzz.rumble, tapEveryMs);
  return () => clearInterval(id);
}
