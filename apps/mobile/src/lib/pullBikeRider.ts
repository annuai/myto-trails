import type { MyProfile } from '@/api/types';

export type PullRider = 'man' | 'woman';

/**
 * Which rider rides across when the page is pulled down. A rider who has said she is a woman always sees the woman. Everyone else, and anyone not
 * signed in or who has not said, sees the man or the woman at random, a different pick on every pull. `roll` is a random number from 0 up to 1.
 */
export const chooseRider = (gender: MyProfile['gender'] | undefined, roll: number): PullRider => (gender === 'female' ? 'woman' : roll < 0.5 ? 'man' : 'woman');
