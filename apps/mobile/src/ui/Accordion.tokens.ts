import { radius } from '@/theme/tokens';

/** Sizes of the accordion item that no other component shares. */
export const accordion = {
  /** The picture tile at the head of an item. */
  lead: 56,
  leadRadius: radius.thumb,
  /** How long an item takes to open or close. */
  durationMs: 300,
  /** The chevron's turn on opening, in degrees. */
  turn: 180,
} as const;
