import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { BackupError, FORMAT, fromBase64, toBase64 } from './format';

// scrypt: 16 MiB of memory, a second or two on a phone. Fixed per format version; change them only together with a version bump.
const SCRYPT = { N: 2 ** 14, r: 8, p: 1, dkLen: 32, asyncTick: 10 } as const;
const SALT_BYTES = 16;
const NONCE_BYTES = 24;

type Header = { version: number; createdAt: string };

const utf8 = (s: string) => new TextEncoder().encode(s);
/** The header is authenticated too, so changing the version or date in the clear makes the file fail to open. */
const aad = (h: Header) => utf8(`${FORMAT}|${h.version}|${h.createdAt}`);
const key = (passphrase: string, salt: Uint8Array) => scryptAsync(utf8(passphrase.normalize('NFKC')), salt, SCRYPT);
/** Derives the key once per file; a streamed backup seals every record with it. */
export const deriveKey = key;

export async function randomBytes(n: number): Promise<Uint8Array> {
  if (globalThis.crypto?.getRandomValues) return globalThis.crypto.getRandomValues(new Uint8Array(n));
  const { getRandomBytes } = await import('expo-crypto');
  return getRandomBytes(n);
}

/** Returns base64 of salt + nonce + ciphertext (the ciphertext ends with the Poly1305 tag). */
export async function encrypt(plain: Uint8Array, passphrase: string, header: Header): Promise<string> {
  const salt = await randomBytes(SALT_BYTES);
  const nonce = await randomBytes(NONCE_BYTES);
  const sealed = xchacha20poly1305(await key(passphrase, salt), nonce, aad(header)).encrypt(plain);
  const out = new Uint8Array(SALT_BYTES + NONCE_BYTES + sealed.length);
  out.set(salt); out.set(nonce, SALT_BYTES); out.set(sealed, SALT_BYTES + NONCE_BYTES);
  return toBase64(out);
}

/** A wrong passphrase and a changed byte are indistinguishable by design: both fail authentication. */
export async function decrypt(ciphertext: string, passphrase: string, header: Header): Promise<Uint8Array> {
  const all = fromBase64(ciphertext);
  if (all.length < SALT_BYTES + NONCE_BYTES) throw new BackupError('corrupt');
  const salt = all.slice(0, SALT_BYTES), nonce = all.slice(SALT_BYTES, SALT_BYTES + NONCE_BYTES), sealed = all.slice(SALT_BYTES + NONCE_BYTES);
  try {
    return xchacha20poly1305(await key(passphrase, salt), nonce, aad(header)).decrypt(sealed);
  } catch {
    throw new BackupError('wrong-passphrase');
  }
}

/** Seals one record of a streamed backup: a fresh random nonce, then the ciphertext. `aad` binds the record to its place in the file. */
export async function sealRecord(k: Uint8Array, plain: Uint8Array, aadText: string): Promise<Uint8Array> {
  const nonce = await randomBytes(NONCE_BYTES);
  const sealed = xchacha20poly1305(k, nonce, utf8(aadText)).encrypt(plain);
  const out = new Uint8Array(NONCE_BYTES + sealed.length);
  out.set(nonce); out.set(sealed, NONCE_BYTES);
  return out;
}

export function openRecord(k: Uint8Array, framed: Uint8Array, aadText: string): Uint8Array {
  if (framed.length < NONCE_BYTES) throw new BackupError('corrupt');
  try {
    return xchacha20poly1305(k, framed.slice(0, NONCE_BYTES), utf8(aadText)).decrypt(framed.slice(NONCE_BYTES));
  } catch {
    throw new BackupError('wrong-passphrase');
  }
}
