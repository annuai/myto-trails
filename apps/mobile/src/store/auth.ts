import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { keychainStorage } from './authStorage';

// The device token goes in the Keychain / Keystore on a phone. The web build has no such store, so it uses localStorage:
// fine for testing, and the reason the production web build should not hold long-lived tokens.
// Set when a read failed because the phone was still locked, so the token is read again once the app comes to the front (bottom of this file).
let unreadable = false;
const keychain = keychainStorage(SecureStore, () => { unreadable = true; });
const secure = {
  getItem: (k: string) => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.getItem(k) ?? null) : keychain.getItem(k)),
  setItem: (k: string, v: string) => (Platform.OS === 'web' ? Promise.resolve(void globalThis.localStorage?.setItem(k, v)) : keychain.setItem(k, v)),
  removeItem: (k: string) => (Platform.OS === 'web' ? Promise.resolve(void globalThis.localStorage?.removeItem(k)) : keychain.removeItem(k)),
};

type State = {
  token: string | null;
  user: { displayName: string; email: string } | null;
  setSession: (token: string, user: { displayName: string; email: string }) => void;
  clear: () => void;
};

/** The signed-in rider's token and name. The token is kept in the Keychain or Keystore. */
export const useAuth = create<State>()(
  persist(
    (set) => ({ token: null, user: null, setSession: (token, user) => set({ token, user }), clear: () => set({ token: null, user: null }) }),
    { name: 'myto-auth', storage: createJSONStorage(() => secure) },
  ),
);

// A background wake that could not read the token (see authStorage) reads it again once the app comes to the front.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state !== 'active' || !unreadable) return;
    unreadable = false;
    void useAuth.persist.rehydrate();
  });
}
