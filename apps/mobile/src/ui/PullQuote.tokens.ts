import { size } from '@/theme/tokens';

/** Sizes of the pull-down strip. The other values (opacity, radius, spacing) come from the shared tokens. */
export const pullQuote = {
  /** Strip height once pulled fully open, in points. */
  open: 96,
  /** The line fades in once the strip is this open. */
  textAt: 28,
  /** Pull past the top (in points) before a new line is taken. */
  trigger: 6,
  /** Space reserved at the bottom of the strip so the text sits optically centred. */
  textInset: 20,
  /** Side margins match the page. */
  inset: size.screenX,
} as const;
