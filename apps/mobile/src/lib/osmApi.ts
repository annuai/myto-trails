import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { authorizeUrl, challengeFor, codeFromRedirect, multipartBody, OSM_API, OSM_REDIRECT, OSM_SITE, osmConfigured, randomToken, tokenBody } from './osm';

// The OpenStreetMap token lives in the Keychain / Keystore, like the app's own sign-in token. The web test build has no such store.
const KEY = 'myto-osm-token';
const vault = {
  get: () => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.getItem(KEY) ?? null) : SecureStore.getItemAsync(KEY)),
  set: (v: string) => (Platform.OS === 'web' ? Promise.resolve(void globalThis.localStorage?.setItem(KEY, v)) : SecureStore.setItemAsync(KEY, v)),
  del: () => (Platform.OS === 'web' ? Promise.resolve(void globalThis.localStorage?.removeItem(KEY)) : SecureStore.deleteItemAsync(KEY)),
};

/** Signs the rider in to OpenStreetMap in the system browser and keeps the token. They see OpenStreetMap's own page, so we never see a password. */
export async function connectOsm(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!osmConfigured()) return { ok: false, error: 'Sharing with OpenStreetMap is not set up in this build yet.' };
  const verifier = randomToken(Crypto.getRandomBytes(32)), state = randomToken(Crypto.getRandomBytes(16));
  try {
    const res = await WebBrowser.openAuthSessionAsync(authorizeUrl({ challenge: challengeFor(verifier), state }), OSM_REDIRECT);
    if (res.type !== 'success') return { ok: false, error: 'The sign-in was not finished.' };
    const got = codeFromRedirect(res.url, state);
    if ('error' in got) return { ok: false, error: got.error };
    const r = await fetch(`${OSM_SITE}/oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: tokenBody(got.code, verifier) });
    const body = (await r.json().catch(() => ({}))) as { access_token?: string; error?: string };
    // invalid_client: the registration on openstreetmap.org is marked confidential, which needs a secret an app cannot keep. It must be a public client (PKCE only).
    if (body.error === 'invalid_client') return { ok: false, error: 'OpenStreetMap does not accept this app registration (it must be a public client). The app needs a new OpenStreetMap client id.' };
    if (!r.ok || !body.access_token) return { ok: false, error: 'OpenStreetMap did not accept the sign-in.' };
    await vault.set(body.access_token);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach OpenStreetMap. Check the connection and try again.' };
  }
}

export const disconnectOsm = (): Promise<void> => vault.del();
export const hasOsmToken = async (): Promise<boolean> => !!(await vault.get());

/** 'sent'; 'auth' when the sign-in has lapsed or was withdrawn; 'refused' when OpenStreetMap will not take this trace; 'later' when it could not be reached. */
export type UploadResult = 'sent' | 'auth' | 'refused' | 'later';

export async function uploadTrace(gpx: string): Promise<UploadResult> {
  const token = await vault.get();
  if (!token) return 'auth';
  const boundary = `myto${randomToken(Crypto.getRandomBytes(12))}`;
  try {
    const r = await fetch(`${OSM_API}/api/0.6/gpx/create`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` }, body: multipartBody(boundary, gpx) });
    if (r.ok) return 'sent';
    if (r.status === 401 || r.status === 403) return 'auth';
    return r.status >= 500 || r.status === 429 ? 'later' : 'refused';
  } catch {
    return 'later';
  }
}
