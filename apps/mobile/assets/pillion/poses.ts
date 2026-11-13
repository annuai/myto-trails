import type { PillionPose } from '@/lib/story/moment';

/**
 * Pillion's poses. The artwork lives in art.ts (the images are in this folder, one `<id>.webp` per pose).
 * `scene` marks a full picture with its own sky and ground, drawn with rounded corners; the rest are cut-outs on a transparent background.
 */
export const POSES: Record<PillionPose, { label: string; scene?: true }> = {
  hello: { label: 'Pillion the dog says hello' },
  waiting: { label: 'Pillion the dog waits beside the bike' },
  map: { label: 'Pillion the dog with a map' },
  'paw-up': { label: 'Pillion the dog with a paw up' },
  'standing-up': { label: 'Pillion the dog standing tall' },
  'tired-happy': { label: 'Pillion the dog, tired and happy' },
  campfire: { label: 'Pillion the dog by a campfire at sunset', scene: true },
  asleep: { label: 'Pillion the dog asleep' },
};

export const POSE_IDS = Object.keys(POSES) as PillionPose[];
