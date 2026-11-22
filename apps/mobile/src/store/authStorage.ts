/** The part of expo-secure-store used here, so the storage can be tested without the native module. */
export type KeychainLike = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: { keychainAccessible?: number }): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
  AFTER_FIRST_UNLOCK: number;
};

/**
 * Where the sign-in token lives on a phone. The default Keychain setting only allows a read while the phone is unlocked, but the ride-recording
 * task wakes the app with the phone locked and the store reads the token then: that read failed with "User interaction is not allowed" as an
 * unhandled rejection (Sentry MYTO-MOBILE-4). So the token is kept readable after the first unlock, an item saved the old way is moved over the
 * first time it is read, and a read that still fails (right after a restart, before any unlock) reads as signed out and calls `onUnreadable`,
 * so the caller can read again once the app is in front.
 */
export function keychainStorage(kc: KeychainLike, onUnreadable: () => void) {
  const options = { keychainAccessible: kc.AFTER_FIRST_UNLOCK };
  return {
    getItem: async (key: string): Promise<string | null> => {
      let value: string | null;
      try { value = await kc.getItemAsync(key); } catch { onUnreadable(); return null; }
      // Move an item saved the old way to the new setting. Best effort: if the write fails, the next read tries again.
      if (value !== null) kc.setItemAsync(key, value, options).catch(() => {});
      return value;
    },
    setItem: (key: string, value: string) => kc.setItemAsync(key, value, options),
    removeItem: (key: string) => kc.deleteItemAsync(key),
  };
}
