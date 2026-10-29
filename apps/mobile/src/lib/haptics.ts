import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';

/** A distinct buzz per ride action, so a rider in gloves can tell what a press did without looking. Never throws: a phone without a motor just stays quiet. */
const quiet = (p: Promise<void>) => { p.catch(() => undefined); };
export const buzz = {
  pause: () => quiet(impactAsync(ImpactFeedbackStyle.Medium)),
  resume: () => quiet(notificationAsync(NotificationFeedbackType.Success)),
  waypoint: () => quiet(impactAsync(ImpactFeedbackStyle.Light)),
  help: () => quiet(notificationAsync(NotificationFeedbackType.Warning)),
  stop: () => quiet(impactAsync(ImpactFeedbackStyle.Heavy)),
};
