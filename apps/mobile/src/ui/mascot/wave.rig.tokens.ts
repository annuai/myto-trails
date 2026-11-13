/**
 * The skeleton of Pillion waving, measured on its traced picture (Wave.tokens.ts), in that picture's own units (1195 by 1316).
 * One bone from the elbow to the paw: points on the forearm turn about the elbow by more the further along they are, so the arm bends.
 */
export const waveRig = {
  elbow: [795, 842],
  paw: [924, 526],
  /** How far from the bone a point still belongs to the arm: full weight inside the first radius, none past the second. The radius widens over the paw. */
  radius: { arm: 58, paw: 76, fade: 22 },
  /** Weight along the bone: none at the elbow, full from `to`. */
  along: { from: 0.05, to: 0.75 },
  /** Three waves, then rest: [share of the loop, degrees]. The first and last are the same pose, so the loop never jumps. */
  keys: [[0, 0], [0.08, -6], [0.2, 11], [0.34, -8], [0.48, 11], [0.62, -8], [0.76, 6], [0.9, 0], [1, 0]],
  seconds: 4,
  /** Breathing: the body grows a little about its feet. */
  breathe: { origin: [600, 1290], x: 0.004, y: 0.012 },
} as const;
