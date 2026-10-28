/** The ride card's own sizes, in pixels of the picture that is saved (not points on the phone's screen). */
export const cardTokens = {
  size: { story: { width: 1080, height: 1920 }, post: { width: 1080, height: 1350 }, square: { width: 1080, height: 1080 } },
  /** The corner of the map box. */
  mapRadius: 28,
  /** How much of the card's own dark colour lies over the map tiles, so the card stays dark and the stats stay readable. */
  mapTint: 0.3,
} as const;
