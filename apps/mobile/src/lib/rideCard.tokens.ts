/** The ride card's own sizes, in pixels of the picture that is saved (not points on the phone's screen). */
export const cardTokens = {
  size: { story: { width: 1080, height: 1920 }, post: { width: 1080, height: 1350 }, square: { width: 1080, height: 1080 } },
  /** The corner of the map box. */
  mapRadius: 28,
  /** How much white lies over the map tiles: a light, softened map, so the route and the card's dark colours stand out against it. */
  mapWash: 0.3,
} as const;
