import type { Contact } from '@/store/profile';

/** How long the rider has to say they are OK before the alert goes out. Long enough for a stunned rider, short enough to matter. */
export const COUNTDOWN_MS = 60_000;
/** India's single emergency number. */
export const EMERGENCY_NUMBER = '112';

export const secondsLeft = (deadline: number, now: number) => Math.max(0, Math.ceil((deadline - now) / 1000));

export type CallTarget = { label: string; phone: string };

/** Who to offer a call to once the alert has gone out: the main emergency contact if there is one, then 112. */
export function callTargets(contacts: Pick<Contact, 'name' | 'phone' | 'primary'>[]): CallTarget[] {
  const main = contacts.find((c) => c.primary) ?? contacts[0];
  return [...(main ? [{ label: `Call ${main.name}`, phone: main.phone }] : []), { label: `Call ${EMERGENCY_NUMBER}`, phone: EMERGENCY_NUMBER }];
}

export const telUrl = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
