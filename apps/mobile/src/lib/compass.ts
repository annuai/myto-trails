/** Compass maths with no phone code, so it is tested on its own. Headings are degrees clockwise from north. */

const WINDS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'] as const;
const SHORT = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

const wind = (deg: number) => Math.round((((deg % 360) + 360) % 360) / 45) % 8;

/** The nearest of the eight winds, in words: 350 is "north", 100 is "east". */
export const headingWord = (deg: number): string => WINDS[wind(deg)]!;

/** The same in letters: "NE". */
export const headingLetters = (deg: number): string => SHORT[wind(deg)]!;

/** The whole degree, 0 to 359, for a readout: 359.6 reads as 0, not 360. */
export const headingDegrees = (deg: number): number => ((Math.round(deg) % 360) + 360) % 360;

/**
 * The angle to turn the dial to so that it takes the short way round: from 350 to 10 is 20 degrees on, not 340 back. `from` is the angle the dial
 * is at now, which may be past 360 or below 0 after earlier turns; the answer is always within 180 of it.
 */
export function turnTo(from: number, to: number): number {
  const delta = ((((to - from) % 360) + 540) % 360) - 180;
  return from + delta;
}
