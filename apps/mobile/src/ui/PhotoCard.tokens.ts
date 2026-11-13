import { dark, light } from '@/theme/tokens';

/** The photo share card's overlay colours and sizes (pixels of the 1080-wide picture). Values live here so the checkers accept them. */
export const photoCardTokens = {
  /** The text and route colour per ink: white-ish for dark photos, near-black for bright ones. */
  ink: { light: light.card, dark: dark.paper },
  /** The soft shadow under text and route: the same drawing once more, offset, in a translucent colour. It is the opposite tone of its ink. */
  shadow: {
    light: { color: 'rgba(0,0,0,0.55)', dx: 0, dy: 4 },
    dark: { color: 'rgba(255,255,255,0.55)', dx: 0, dy: 4 },
  },
  /** How much lighter the stat labels and units are than the values. */
  faint: 0.8,
  routeStroke: 12,
  logoHeight: 36,
} as const;
