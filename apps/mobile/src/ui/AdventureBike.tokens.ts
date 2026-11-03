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
