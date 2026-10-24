import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Encrypts short secrets (phone numbers) at rest with AES-256-GCM. The key comes from CONTACT_SECRET (at least 32
 * characters, required in production); development without it uses a fixed key and says so.
 */
function key(): Buffer {
  const secret = process.env.CONTACT_SECRET?.trim();
  if (secret && secret.length >= 32) return createHash("sha256").update(secret).digest();
  if (process.env.NODE_ENV === "production") throw new Error("CONTACT_SECRET must be set (at least 32 characters) to share contact details");
  return createHash("sha256").update("development-only-contact-secret").digest();
}

const b64 = (b: Buffer) => b.toString("base64url");

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `v1.${b64(iv)}.${b64(cipher.getAuthTag())}.${b64(ct)}`;
}

/** Returns null for anything that is not a valid, untampered value made with the current key. */
export function decryptSecret(value: string): string | null {
  const [v, iv, tag, ct] = value.split(".");
  if (v !== "v1" || !iv || !tag || !ct) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
