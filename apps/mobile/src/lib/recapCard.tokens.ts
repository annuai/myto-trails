/**
 * The year recap cards' own sizes, in pixels of the picture that is saved (not points on the phone's screen). One 9:16 canvas, the
 * shape of a phone story; the figures sit between 300 and 1680 px, clear of a story app's own bars at the top and bottom.
 */
export const recapTokens = {
  size: { width: 1080, height: 1920 },
  pad: 96,
  /** The Myto logo and the year across the top of every card. */
  brand: { logoHeight: 84, top: 140, year: 40 },
  /** The width of one card in the swipe row on the Your year screen, and the gap between two. */
  previewWidth: 248,
  previewGap: 16,
  /** How much of full ink or white the quieter text keeps, and the empty dots and bars. */
  faint: 0.64,
  ghost: 0.12,
  /** Michroma's width per character and per comma or point, for fitting a big number to the card (it is a wide face). */
  displayAdvance: 0.94,
  displayPunct: 0.36,
  font: { hero: 300, headline: 150, lead: 72, body: 50, small: 40, axis: 30, figure: 68, title: 120 },
  /** The distance card: the number, its unit, twelve month bars and the three figures at the foot. */
  odometer: { number: 680, unit: 770, barsTop: 900, barsHeight: 330, barGap: 14, axis: 1290, note: 1400, rule: 1490, figure: 1590, figureLabel: 1646 },
  /** The calendar card: one row of dots a month, one dot a day. */
  days: { line1: 500, line2: 650, gridTop: 770, rowPitch: 40, labelWidth: 56, dot: 9.5, total: 1370, sub: 1440, title: 1560 },
  /** The single-number cards (kilometres, the longest ride). */
  single: { lead: 760, number: 1100, unit: 1200, barTop: 1340, barHeight: 24, note: 1440 },
  /** The title card: Pillion by the campfire, then the title. */
  title: { artTop: 300, artRadius: 48, lead: 1330, name: 1470, sub: 1560 },
} as const;
