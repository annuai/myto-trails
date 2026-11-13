/** How a film look is drawn: the grain's fineness and strength, and the vignette's reach. Strengths come from lib/filmLook. */
export const filmImage = {
  /** Grain feature size, per pixel of the picture (about one and a half pixels). */
  grainFrequency: 0.65, grainOctaves: 2, grainSeed: 7,
  /** The grain layer's opacity is the look's grain strength times this. */
  grainOpacityScale: 0.6,
  /** Halftone: how many dot cells across the picture, and a dot's radius as a share of a cell. */
  dotCells: 90, dotRadius: 0.32,
  /** Where the vignette starts to darken, as a share of the distance from the centre to the corner. */
  vignetteStart: 0.55,
  /** Long side, in pixels, of a baked picture (the same as a plain journal photo), and how long to let the hidden picture settle before it is captured. */
  bakeLongSide: 1600, previewLongSide: 1080, bakeJpegQuality: 0.85, bakeSettleMs: 600,
} as const;
