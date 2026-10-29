/** The year recap card's own sizes, in pixels of the picture that is saved (not points on the phone's screen). */
export const recapTokens = {
  size: { width: 1080, height: 1920 },
  pad: 88,
  logoHeight: 64,
  /** The width of the small preview on the Your year screen. */
  previewWidth: 220,
  /** How much of full white the quieter text keeps. */
  faint: 0.64,
  font: { kicker: 40, year: 240, heroValue: 220, heroUnit: 84, label: 30, value: 88, unit: 38, month: 76, badge: 34 },
  /** Baselines, from the top of the card. */
  y: { kicker: 150, year: 400, heroLabel: 610, hero: 810, gridLabel: 1010, grid: 1110, bestLabel: 1290, best: 1390, bestSub: 1450 },
} as const;
