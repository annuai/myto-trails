import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { DELETE_CONFIRMATION } from '@moto-trails/domain';
import { api } from '@/api/client';
import { SITE_BASE } from '@/api/config';
import { forgetProfile } from '@/api/useApi';
import { useAuth } from '@/store/auth';

const b64url = (bytes: Uint8Array) => {
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const PENDING = 'myto-pkce';
type Pending = { verifier: string; state: string };

// The email link opens in the phone's browser, so the app may be closed by the system before the rider comes back.
// The verifier is therefore kept in the Keychain until the sign-in finishes (the web build uses sessionStorage).
const savePending = async (p: Pending) => {
  if (Platform.OS === 'web') sessionStorage.setItem(PENDING, JSON.stringify(p));
  else await SecureStore.setItemAsync(PENDING, JSON.stringify(p));
};
const takePending = async (): Promise<Pending | null> => {
  if (Platform.OS === 'web') {
    const raw = sessionStorage.getItem(PENDING);
    sessionStorage.removeItem(PENDING);
    return raw ? (JSON.parse(raw) as Pending) : null;
  }
  const raw = await SecureStore.getItemAsync(PENDING);
  await SecureStore.deleteItemAsync(PENDING);
  return raw ? (JSON.parse(raw) as Pending) : null;
};

const redirectUri = () => (Platform.OS === 'web' ? `${window.location.origin}/auth/callback` : Linking.createURL('auth'));

/**
 * Sign in the way the website does: an email link. The app opens the website's "connect the app" page, which sends the
 * rider through the normal email-link sign-in, then hands back a one-time code. The app trades the code for a device
 * token with its secret verifier (PKCE), so a code seen by another app on the phone is useless.
 */
export async function startSignIn(): Promise<void> {
  const verifier = b64url(Crypto.getRandomBytes(32));
  const state = b64url(Crypto.getRandomBytes(16));
  const challenge = b64url(new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new TextEncoder().encode(verifier))));
  const url = `${SITE_BASE}/auth/app?challenge=${challenge}&redirect_uri=${encodeURIComponent(redirectUri())}&state=${state}`;
  await savePending({ verifier, state });
  if (Platform.OS === 'web') {
    window.location.assign(url);
    return;
  }
  // The system browser, not an in-app sheet: the email link opens in Safari, and a sheet left open from an earlier try
  // would block the next one. The website hands the code back through the myto://auth link (app/auth/index.tsx).
  await Linking.openURL(url);
}

/** Second half of sign-in: the code from the redirect, plus the verifier only this app holds. */
export async function finishSignIn(code: string, state: string): Promise<void> {
  const stored = await takePending();
  if (!stored || !code || stored.state !== state) throw new Error('Sign-in was not started from this app. Try again.');
  const { token } = await api<{ token: string }>('/auth/token', { method: 'POST', body: { code, verifier: stored.verifier, kind: Platform.OS === 'ios' ? 'app_ios' : 'app_android' } });
  const me = await api<{ displayName: string; email: string }>('/me', { token });
  useAuth.getState().setSession(token, { displayName: me.displayName, email: me.email });
}

export async function signOut(): Promise<void> {
  const token = useAuth.getState().token;
  useAuth.getState().clear();
  if (token) await api('/auth/token', { method: 'DELETE', token }).catch(() => undefined); // revokes it on the server; offline just forgets it here
}

/** Deletes the signed-in account on the server, then forgets it here. Rides, journal and documents on this phone are untouched. */
export async function deleteAccount(): Promise<void> {
  const token = useAuth.getState().token;
  if (!token) return;
  await api('/me', { method: 'DELETE', token, body: { confirm: DELETE_CONFIRMATION } });
  useAuth.getState().clear();
  forgetProfile();
}
