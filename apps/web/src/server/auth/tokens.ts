import { createHash, randomBytes } from "node:crypto";

/** A 256-bit random, URL-safe token. Only its hash is ever stored. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** The SHA-256 of a token. Only this hash is ever stored. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
