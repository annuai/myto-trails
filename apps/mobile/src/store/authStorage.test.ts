import { describe, expect, it, vi } from 'vitest';
import { keychainStorage, type KeychainLike } from './authStorage';

const AFTER_FIRST_UNLOCK = 1;
const fake = (over: Partial<KeychainLike> = {}): KeychainLike => ({
  getItemAsync: vi.fn(async () => null), setItemAsync: vi.fn(async () => {}), deleteItemAsync: vi.fn(async () => {}), AFTER_FIRST_UNLOCK, ...over,
});

describe('keychain storage for the sign-in token', () => {
  // Sentry MYTO-MOBILE-4: the ride-recording task wakes the app with the phone locked, and a Keychain item kept "only while unlocked" then fails to read.
  it('writes the token readable after the first unlock, so a background wake can read it', async () => {
    const kc = fake();
    await keychainStorage(kc, () => {}).setItem('myto-auth', 'v');
    expect(kc.setItemAsync).toHaveBeenCalledWith('myto-auth', 'v', { keychainAccessible: AFTER_FIRST_UNLOCK });
  });

  it('moves a token saved the old way to the new setting the first time it is read', async () => {
    const kc = fake({ getItemAsync: vi.fn(async () => 'old') });
    expect(await keychainStorage(kc, () => {}).getItem('myto-auth')).toBe('old');
    expect(kc.setItemAsync).toHaveBeenCalledWith('myto-auth', 'old', { keychainAccessible: AFTER_FIRST_UNLOCK });
  });

  it('reads as signed out, not as a rejection, while the phone is locked, and says so for a retry', async () => {
    const onUnreadable = vi.fn();
    const kc = fake({ getItemAsync: vi.fn(async () => { throw new Error('User interaction is not allowed.'); }) });
    expect(await keychainStorage(kc, onUnreadable).getItem('myto-auth')).toBeNull();
    expect(onUnreadable).toHaveBeenCalledOnce();
    expect(kc.setItemAsync).not.toHaveBeenCalled();
  });

  it('removes the item', async () => {
    const kc = fake();
    await keychainStorage(kc, () => {}).removeItem('myto-auth');
    expect(kc.deleteItemAsync).toHaveBeenCalledWith('myto-auth');
  });
});
