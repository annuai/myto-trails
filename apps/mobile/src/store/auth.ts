import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// The device token goes in the Keychain / Keystore on a phone. The web build has no such store, so it uses localStorage:
// fine for testing, and the reason the production web build should not hold long-lived tokens.
const secure = {
  getItem: (k: string) => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.getItem(k) ?? null) : SecureStore.getItemAsync(k)),
  setItem: (k: string, v: string) => (Platform.OS === 'web' ? Promise.resolve(void globalThis.localStorage?.setItem(k, v)) : SecureStore.setItemAsync(k, v)),
  removeItem: (k: string) => (Platform.OS === 'web' ? Promise.resolve(void globalThis.localStorage?.removeItem(k)) : SecureStore.deleteItemAsync(k)),
};

type State = {
  token: string | null;
  user: { displayName: string; email: string } | null;
  setSession: (token: string, user: { displayName: string; email: string }) => void;
  clear: () => void;
};

export const useAuth = create<State>()(
  persist(
    (set) => ({ token: null, user: null, setSession: (token, user) => set({ token, user }), clear: () => set({ token: null, user: null }) }),
    { name: 'myto-auth', storage: createJSONStorage(() => secure) },
  ),
);
