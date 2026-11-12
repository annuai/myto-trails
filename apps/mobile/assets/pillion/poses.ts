import type { ImageSourcePropType } from 'react-native';
import type { PillionPose } from '@/lib/story/moment';

/** Pillion's poses. `source` stays null until the artwork is dropped in as a webp (see README.md); the component shows a quiet glyph meanwhile. */
export const POSES: Record<PillionPose, { source: ImageSourcePropType | null; label: string }> = {
  hello: { source: null, label: 'Pillion the dog says hello' },
  waiting: { source: null, label: 'Pillion the dog waits beside the bike' },
  map: { source: null, label: 'Pillion the dog with a map' },
  'paw-up': { source: null, label: 'Pillion the dog with a paw up' },
  'standing-up': { source: null, label: 'Pillion the dog standing tall' },
  'tired-happy': { source: null, label: 'Pillion the dog, tired and happy' },
  campfire: { source: null, label: 'Pillion the dog by a campfire at sunset' },
  asleep: { source: null, label: 'Pillion the dog asleep' },
};

export const POSE_IDS = Object.keys(POSES) as PillionPose[];
