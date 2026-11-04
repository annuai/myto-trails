/** Sizes for the Fix it screens that no other screen shares. */
export const fixit = {
  /** Width over height of a guide picture: the pictures are drawn 4:3. */
  artRatio: 4 / 3,
  /** Round marker that holds a step's number. */
  stepBadge: 36,
  /** The picture is never taller than this on a tall phone held sideways. */
  artMaxHeight: 320,
} as const;
