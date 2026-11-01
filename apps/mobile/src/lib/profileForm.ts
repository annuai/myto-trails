import type { MyProfile } from '@/api/types';
import { hasLink } from './community';

export const NAME_MIN = 2;
export const NAME_MAX = 40;
export const BIO_MAX = 300;

export const GENDER_CHOICES: { value: MyProfile['gender']; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: null, label: 'Prefer not to say' },
];

/** What is wrong with the name or bio, in plain words, or undefined. The server checks the same limits. */
export function profileProblem({ name, bio }: { name: string; bio: string }): string | undefined {
  const n = name.trim().length;
  if (n < NAME_MIN || n > NAME_MAX) return `Use ${NAME_MIN} to ${NAME_MAX} characters for your name.`;
  const b = bio.trim();
  if (b.length > BIO_MAX) return `Keep your bio to ${BIO_MAX} characters.`;
  if (hasLink(b)) return 'Please leave web addresses out of your bio.';
  return undefined;
}
