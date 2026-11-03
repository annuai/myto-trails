/** Sizes and timings of the bike that rides across the top of a page pulled down a long way. */
export const pullBike = {
  /** Pull past the top (in points) that sends the bike: well past the quote strip, which is fully open at 96. */
  trigger: 140,
  /** The bike's height in points, wheels included; its width follows the picture. */
  height: 80,
  /** Time to cross the page, in milliseconds. */
  runMs: 3600,
  /** Gap between the light taps of the engine while it rides. */
  rumbleMs: 90,
  /** How far the bike bobs up and down on the way, in points, and how many bobs it makes crossing. */
  bob: 2,
  bobs: 12,
} as const;
