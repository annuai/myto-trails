/**
 * The skeleton of the trail dog, measured on its traced picture (TrailDog.tokens.ts), in that picture's own units (1310 by 1201).
 * Every point of every shape is tied to these bones by weights worked out once (rig.ts), so the outline, the fills and the shading
 * move together and nothing breaks off.
 */
export const trailDogRig = {
  /** Where each leg hangs from (hip) and where its paw rests (foot), and how far from that line a point still belongs to the leg: full weight inside the first radius, none past the second. */
  legs: [
    { name: 'nearRear', hip: [385, 700], foot: [305, 1090], radii: [62, 86], pair: 1 },
    { name: 'farRear', hip: [520, 760], foot: [495, 1045], radii: [55, 76], pair: 0 },
    { name: 'nearFront', hip: [765, 650], foot: [760, 1000], radii: [50, 64], pair: 0 },
    { name: 'farFront', hip: [865, 650], foot: [868, 990], radii: [52, 64], pair: 1 },
  ],
  /** The head turns about the base of the neck: full weight above `toY`, none below `fromY`, and only right of `fromX` (so the pack is left alone). */
  head: { pivot: [845, 395], fromY: 385, toY: 300, fromX: 450, toX: 520, /** How far the nose is lowered while walking; it lifts to the drawn pose on arrival. */ levelDeg: 18 },
  /** The tail curl swings about where it joins the back; points near that joint hardly move. */
  tail: { pivot: [400, 650], centre: [310, 585], inner: 115, outer: 150, baseFrom: 60, baseTo: 130, maxY: 690 },
  /** The rock fill is about 15 units of dark outline below the paws' soles; the dog is drawn above that line, the rock below it. */
  band: 15,
  /** Where the dog is breathing from (its feet). */
  breathe: [650, 1010],
  walk: {
    /** How far left of its drawn place the dog starts, and the length of a step (the foot moves this far relative to the body, so a trot is two of them). */
    distance: 150,
    stride: 60,
    /** How high a paw is raised mid-step. */
    lift: 10,
    seconds: 2.2,
    /** The last paw to be in the air comes down over this long once the dog has stopped. */
    settle: 0.25,
    fade: 0.25,
    /** Looking up starts a little before the dog stops, and takes this long. */
    lookStart: 2.05,
    lookSeconds: 0.9,
  },
  idle: { tailDeg: 3, tailSeconds: 1.6, breatheSeconds: 4, breatheX: 0.003, breatheY: 0.01 },
} as const;
