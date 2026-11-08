/** The ride compass: brand red disc, white ring and notch, sky blue north. Drawn on a 64 by 64 grid and scaled to any size. */
export const compass = {
  red: '#af442e',
  white: '#ffffff',
  /** The north tip of the needle and the N: light enough to read on the red. */
  blue: '#7ab8ec',
  /** Sizes in points. */
  mini: 36,
  /** The full-screen dial, as a share of the shorter side of the screen, and its largest size. */
  fullShare: 0.78,
  fullMax: 440,
  /** The needle while there is no heading: faded, the dial itself stays as it is. */
  unknownOpacity: 0.4,
  /** How long the dial takes to follow a new heading, in milliseconds. */
  turnMs: 350,
  grid: 64,
  centre: 32,
  discR: 31,
  ring: { r: 26, rich: 27.5, width: 1.5, opacity: 0.35 },
  /** The white notch at the top: straight ahead. */
  notch: { mini: { top: 3.5, bottom: 11.5, half: 5 }, rich: { top: 1.5, bottom: 7.5, half: 3.2 } },
  /** The needle: tip and tail distance from the centre, and half its width. */
  needle: { mini: { reach: 19, half: 6.5 }, rich: { reach: 9.5, half: 3.6 } },
  pivot: 3.4,
  /** Small marks across the ring in the compact version. */
  miniMarks: [{ x: 31, y: 49, w: 2, h: 6 }, { x: 49, y: 31, w: 6, h: 2 }, { x: 9, y: 31, w: 6, h: 2 }],
  /** The full dial: a tick every 15 degrees, longer every 45, and the four letters inside them. */
  rich: { tickOut: 25.2, tickMinor: 23.2, tickMajor: 21.2, letterR: 15, letterSize: 8.4, minorOpacity: 0.55 },
} as const;
