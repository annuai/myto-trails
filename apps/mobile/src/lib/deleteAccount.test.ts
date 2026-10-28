import { describe, expect, it, vi } from 'vitest';

// The API client reads React Native's __DEV__ flag when it loads.
vi.hoisted(() => { (globalThis as { __DEV__?: boolean }).__DEV__ = false; });

import { DELETE_CONFIRMATION } from '@moto-trails/domain';
import { ApiFailure } from '@/api/client';
import { canConfirmDelete, deleteFailureMessage } from './deleteAccount';

describe('canConfirmDelete', () => {
  it('needs the typed word, ignoring case and spaces', () => {
    expect(DELETE_CONFIRMATION).toBe('delete');
    expect(canConfirmDelete(' Delete ')).toBe(true);
    for (const bad of ['', 'del', 'delete it', 'deleted']) expect(canConfirmDelete(bad)).toBe(false);
  });
});

describe('deleteFailureMessage', () => {
  it('passes on the server message when a club still needs an admin', () => {
    const e = new ApiFailure(409, 'club_admin', 'You are the only admin of Trail Club 1. Make another member an admin, or leave the club, first.');
    expect(deleteFailureMessage(e)).toContain('Trail Club 1');
  });
  it('says so when the network is down', () => {
    expect(deleteFailureMessage(new ApiFailure(0, 'network', 'Cannot reach Moto Trails. Check your connection.'))).toContain('Cannot reach');
  });
  it('never shows a raw error for anything else', () => {
    expect(deleteFailureMessage(new Error('boom: stack trace'))).toBe('We could not delete the account. Try again.');
    expect(deleteFailureMessage(new ApiFailure(500, 'internal_error', 'Something went wrong on our side.'))).toBe('We could not delete the account. Try again.');
  });
});
