/**
 * The adventure bike with its rider, drawn from two pictures: the body (no wheels) and one wheel, used for both.
 * The numbers are in the body picture's own pixels: the canvas they are laid out on, and the axle points the wheels turn about.
 */
export const adventureBike = {
  width: 1774,
  /** The canvas is taller than the body picture so the wheels, which hang below it, fit. */
  height: 910,
  bodyHeight: 887,
  rear: { x: 468, y: 722 },
  front: { x: 1292, y: 714 },
  /** A wheel's diameter. */
  wheel: 375,
} as const;

/**
 * The black Dominar 400 with a woman rider, drawn from the same two kinds of picture. The body picture is the same size as the adventure
 * bike's; its axle points were measured on the picture (the swingarm and fork ends), and the wheel is the diameter that fits its wheelbase.
 */
export const dominarBike = {
  width: 1774,
  /** The wheels hang below the body picture: the lower axle (783) plus a wheel's radius (192), rounded up. */
  height: 976,
  bodyHeight: 887,
  rear: { x: 406, y: 779 },
  front: { x: 1339, y: 783 },
  wheel: 384,
} as const;
