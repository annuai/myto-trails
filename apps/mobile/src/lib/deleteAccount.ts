import { DELETE_CONFIRMATION } from '@moto-trails/domain';
import { ApiFailure } from '@/api/client';

export function canConfirmDelete(typed: string): boolean {
  return typed.trim().toLowerCase() === DELETE_CONFIRMATION;
}

/** What to tell the rider: the server's own words when they help (a club needs an admin, no connection), otherwise something plain. */
export function deleteFailureMessage(e: unknown): string {
  if (e instanceof ApiFailure && (e.status === 409 || e.status === 0)) return e.message;
  return 'We could not delete the account. Try again.';
}
