import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { api } from '@/api/client';
import { SITE_BASE } from '@/api/config';
import { useAuth } from '@/store/auth';

const b64url = (bytes: Uint8Array) => {
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const PENDING = 'myto-pkce';
let memory: { verifier: string; state: string } | null = null;

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
  const pending = { verifier, state };
  if (Platform.OS === 'web') {
    sessionStorage.setItem(PENDING, JSON.stringify(pending));
    window.location.assign(url);
    return;
  }
  memory = pending;
  const res = await WebBrowser.openAuthSessionAsync(url, redirectUri());
  if (res.type === 'success') {
    const q = Linking.parse(res.url).queryParams ?? {};
    await finishSignIn(String(q.code ?? ''), String(q.state ?? ''));
  }
}

/** Second half of sign-in: the code from the redirect, plus the verifier only this app holds. */
export async function finishSignIn(code: string, state: string): Promise<void> {
  const stored = Platform.OS === 'web' ? (JSON.parse(sessionStorage.getItem(PENDING) ?? 'null') as typeof memory) : memory;
  sessionStorage?.removeItem?.(PENDING);
  memory = null;
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
