/** The in-app camera: always dark (like any camera app), whatever the theme. */
export const cameraTokens = {
  /** The viewfinder's shape (width over height, a 3:4 photo) and its corner. */
  aspect: 3 / 4, corner: 20,
  /** The shutter: outer ring, inner disc, and the ring's stroke. */
  shutter: 76, shutterInner: 62, shutterRing: 4,
  /** Round controls: the top bar's buttons and the library and flip buttons. */
  control: 44, thumb: 48,
  /** A look's swatch in the strip (a real preview of the look on a sample photo), its selected ring and the gap to its name. */
  swatch: 60, swatchRing: 2.5,
  /** Rule-of-thirds lines. */
  gridLine: 1, gridOpacity: 0.35,
  /** Dimmed text and unselected swatches, and the chrome behind round buttons. */
  dim: 0.6, chrome: 'rgba(255,255,255,0.14)', chromeActive: 'rgba(255,255,255,0.28)',
  /** How long the look's name stays over the picture after a change, and the shutter's flash. */
  nameHoldMs: 900, flashMs: 120,
  /** Sideways travel on the viewfinder that counts as a swipe between looks. */
  swipeDistance: 40, tapSlop: 10,
  /** The zoom steps offered, and the focus ring that shows where a tap focused. */
  zooms: [1, 2], focusRing: 64, focusHoldMs: 700,
} as const;
