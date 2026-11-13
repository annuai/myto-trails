/** The photo card's layout numbers, in pixels of the 1080-wide picture: shared by the box maths (photoCard.ts) and the drawing (PhotoOverlay.tsx) so they cannot drift apart. */
export const photoLayout = {
  pictureWidth: 1080,
  bar: { routeHeight: 300, plainHeight: 190 },
  corner: { width: 540, routeHeight: 400, perStat: 130, pad: 40 },
  /** Type sizes and the offsets of a stat's label and value from its top. */
  type: { label: 28, valueBar: 80, valueBarDense: 64, valueCorner: 72, unitRatio: 0.42 },
  offset: { label: 36, valueBar: 112, valueCorner: 104 },
  /** Room kept around a route inside its area. */
  routePad: 10,
  /** The Myto logo's own viewBox height, to scale it. */
  logoViewHeight: 42,
} as const;
