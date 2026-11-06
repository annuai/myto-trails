import type { MyProfile } from '@/api/types';

/** The man on the adventure bike, the woman on the black Dominar, or the woman on the grey Dominar with lime-green trim. */
export type PullRider = 'man' | 'woman' | 'womanLime';

/**
 * Which rider rides across when the page is pulled down. A rider who has said she is a woman only ever sees the women, one or the other at
 * random. Everyone else, and anyone not signed in or who has not said, sees the man half the time and one of the women the other half. The pick
 * is new on every pull. `roll` is a random number from 0 up to 1.
 */
export function chooseRider(gender: MyProfile['gender'] | undefined, roll: number): PullRider {
  if (gender === 'female') return roll < 0.5 ? 'woman' : 'womanLime';
  return roll < 0.5 ? 'man' : roll < 0.75 ? 'woman' : 'womanLime';
}
