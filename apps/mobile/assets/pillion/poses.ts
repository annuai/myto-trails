import type { PillionPose } from '@/lib/story/moment';

/**
 * Pillion's poses. The artwork lives in art.ts (the images are in this folder, one `<id>.webp` per pose).
 * `scene` marks a full picture with its own sky and ground, drawn with rounded corners; the rest are cut-outs on a transparent background.
 */
export const POSES: Record<PillionPose, { label: string; scene?: true; /** The picture is cut off on this side (the bike's front wheel is out of frame), so a dialog sets it flush against that edge and the cut reads as the card's own edge. */ bleed?: 'right' }> = {
  hello: { label: 'Pillion the dog says hello' },
  waiting: { label: 'Pillion the dog waits beside the bike' },
  map: { label: 'Pillion the dog with a map' },
  'paw-up': { label: 'Pillion the dog with a paw up' },
  'standing-up': { label: 'Pillion the dog standing tall' },
  'tired-happy': { label: 'Pillion the dog, tired and happy' },
  campfire: { label: 'Pillion the dog by a campfire at sunset', scene: true },
  asleep: { label: 'Pillion the dog asleep' },
  'waiting-for-a-ride': { label: 'Pillion the dog sits by the bike, looking up and waiting for a ride', bleed: 'right' },
  'time-to-rest': { label: 'Pillion the dog curled up asleep' },
  'map-reading': { label: 'Pillion the dog reading a map' },
};

export const POSE_IDS = Object.keys(POSES) as PillionPose[];
