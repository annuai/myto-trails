import type { ImageSourcePropType } from 'react-native';
import type { PillionPose } from '@/lib/story/moment';

/**
 * The artwork, kept apart from poses.ts because `require` of an image only works in the app bundle, not in unit tests.
 * Ten are cut-outs on a transparent background; `campfire` is a full scene (see poses.ts, `scene`).
 */
export const ART: Record<PillionPose, ImageSourcePropType> = {
  hello: require('./hello.webp') as number,
  waiting: require('./waiting.webp') as number,
  map: require('./map.webp') as number,
  'paw-up': require('./paw-up.webp') as number,
  'standing-up': require('./standing-up.webp') as number,
  'tired-happy': require('./tired-happy.webp') as number,
  campfire: require('./campfire.webp') as number,
  asleep: require('./asleep.webp') as number,
  'waiting-for-a-ride': require('./waiting-for-a-ride.webp') as number,
  'time-to-rest': require('./time-to-rest.webp') as number,
  'map-reading': require('./map-reading.webp') as number,
};
