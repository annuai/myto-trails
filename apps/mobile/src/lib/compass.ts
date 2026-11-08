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

export type Vec3 = { x: number; y: number; z: number };

/**
 * The direction the phone is pointing, from its accelerometer (`accel`, reading upward as Android's does: face up on a table is z = +1) and its
 * magnetometer (`mag`, any unit), in degrees clockwise from magnetic north. "Pointing" is the top edge when the phone lies flat and the back of the
 * phone when it stands upright in a handlebar mount, the way a rider's phone faces; in between the two blend, so there is no jump. It works in
 * portrait or landscape, because the back of an upright phone points the same way either way. Undefined when the readings cannot say (no field, free fall).
 */
export function sensorHeading(accel: Vec3, mag: Vec3): number | undefined {
  // East is magnetic field cross up; north is up cross east.
  const hx = mag.y * accel.z - mag.z * accel.y, hy = mag.z * accel.x - mag.x * accel.z, hz = mag.x * accel.y - mag.y * accel.x;
  const hn = Math.hypot(hx, hy, hz), an = Math.hypot(accel.x, accel.y, accel.z);
  if (hn < 1e-6 || an < 1e-6) return undefined;
  const e = { x: hx / hn, y: hy / hn, z: hz / hn };
  const u = { x: accel.x / an, y: accel.y / an, z: accel.z / an };
  const n = { x: u.y * e.z - u.z * e.y, y: u.z * e.x - u.x * e.z, z: u.x * e.y - u.y * e.x };
  // The pointing direction in the phone's own axes is its back (0, 0, -1), plus its top edge (0, 1, 0) as the phone goes flat. The top edge counts only
  // near flat (sixth power of how flat), because an upright phone turned on its side has a top edge that points sideways.
  const w = Math.abs(u.z) ** 6;
  const east = w * e.y - e.z, north = w * n.y - n.z;
  if (Math.hypot(east, north) < 1e-6) return undefined;
  return (((Math.atan2(east, north) * 180) / Math.PI) + 360) % 360;
}

/** Moves `from` a share `alpha` (0 to 1) of the short way towards `to`, staying within 0 to 360: a steady compass that does not jitter. */
export function easeAngle(from: number, to: number, alpha: number): number {
  return (((turnTo(from, to) - from) * alpha + from) % 360 + 360) % 360;
}
