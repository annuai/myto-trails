/** The photo card's layout numbers, in pixels of the 1080-wide picture: shared by the box maths (photoCard.ts) and the drawing (PhotoOverlay.tsx) so they cannot drift apart. */
export const photoLayout = {
  pictureWidth: 1080,
  /** The bottom of each layout holds the logo (`logoHeight` in PhotoCard.tokens): 36 px of room was added to it when the logo grew from 36 to 72. */
  bar: { routeHeight: 336, plainHeight: 226 },
  corner: { width: 540, routeHeight: 400, perStat: 130, pad: 76 },
  /** Type sizes and the offsets of a stat's label and value from its top. */
  type: { label: 28, valueBar: 80, valueBarDense: 64, valueCorner: 72, unitRatio: 0.42 },
  offset: { label: 36, valueBar: 112, valueCorner: 104 },
  /** Room kept around a route inside its area. */
  routePad: 10,
  /** The Myto logo's own viewBox height, to scale it. */
  logoViewHeight: 42,
} as const;
