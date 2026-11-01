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

export const PHONE_MIN_DIGITS = 7;
export const PHONE_MAX_DIGITS = 15;
export const DECLARATION = 'I am 18 or older and hold a valid driving licence';

/** A phone number as typed, without spaces, dashes, dots and brackets. A leading + stays. */
export const cleanPhone = (v: string): string => v.replace(/[\s\-.()]/g, '');

/** What is wrong with an optional phone number, or undefined. Empty is fine. A sanity check only (7 to 15 digits); the server is the authority. */
export function phoneProblem(phone: string): string | undefined {
  const p = cleanPhone(phone);
  if (!p) return undefined;
  const digits = p.startsWith('+') ? p.slice(1) : p;
  if (!/^\d+$/.test(digits) || digits.length < PHONE_MIN_DIGITS || digits.length > PHONE_MAX_DIGITS) return 'Enter a valid phone number (for India, 10 digits), or leave it empty.';
  return undefined;
}

/** The welcome step's problems, by field, in plain words. Empty object when it can be sent. */
export function welcomeProblems({ name, phone, declared }: { name: string; phone: string; declared: boolean }): { name?: string; phone?: string; declaration?: string } {
  const n = name.trim().length;
  return {
    ...(n < NAME_MIN || n > NAME_MAX ? { name: `Use ${NAME_MIN} to ${NAME_MAX} characters for your name.` } : {}),
    ...(phoneProblem(phone) ? { phone: phoneProblem(phone) } : {}),
    ...(declared ? {} : { declaration: 'Please confirm the declaration to continue.' }),
  };
}

/** The body for POST /me/welcome. Rider pages start private; the phone is left out when empty. */
export function welcomeBody({ name, gender, phone }: { name: string; gender: MyProfile['gender']; phone: string }) {
  const p = cleanPhone(phone);
  return { confirmed: true as const, displayName: name.trim(), public: false, gender, ...(p ? { phone: p } : {}) };
}

/** What PUT /me/profile should carry for the phone: nothing when it did not change (a missing key leaves it), null to clear. */
export function phonePatch(saved: string | null | undefined, typed: string): { phone: string | null } | undefined {
  const next = cleanPhone(typed);
  if (next === cleanPhone(saved ?? '')) return undefined;
  return { phone: next || null };
}

/** A failed welcome request in the words the rider should read. Anything else keeps the server's own message. */
export function welcomeFailure(f: { status: number; code: string; message: string; fields?: Record<string, string> }): string {
  if (f.code === 'declaration_required') return 'Please confirm the declaration to continue.';
  if (f.code === 'validation_failed') return f.fields?.phone ? 'Enter a valid phone number (for India, 10 digits), or leave it empty.' : `Use ${NAME_MIN} to ${NAME_MAX} characters for your name.`;
  return f.message;
}
