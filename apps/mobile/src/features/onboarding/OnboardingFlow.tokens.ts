/**
 * How the welcome pages move while the rider swipes. All three are fractions of one page width (the distance between two pages).
 * `pictureFade`: how far a picture travels before it has dissolved (and how far before it arrives that it starts to show).
 * `textFade`: the same for the words, a little shorter so a half-cut line is never readable.
 * `drift`: how far a picture slides sideways against the swipe; the words move with the finger, so the picture seems further away.
 */
export const pager = { pictureFade: 0.55, textFade: 0.45, drift: 0.12 } as const;
