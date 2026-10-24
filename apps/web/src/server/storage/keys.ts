import { InvalidExpiryError, InvalidKeyError } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KINDS = ["gpx", "image", "evidence"] as const;
const EXTENSIONS = ["gpx", "jpg", "png", "webp", "avif", "heic", "pdf"] as const;
const MAX_KEY_LENGTH = 200;

export type ObjectKind = (typeof KINDS)[number];
export type ObjectExtension = (typeof EXTENSIONS)[number];

/** Object names are generated, never taken from user filenames. */
export function buildObjectKey(i: { kind: ObjectKind; ownerId: string; objectId: string; ext: ObjectExtension }): string {
  if (!KINDS.includes(i.kind)) throw new InvalidKeyError("Unknown object kind");
  if (!EXTENSIONS.includes(i.ext)) throw new InvalidKeyError("Extension not allowed");
  if (!UUID.test(i.ownerId) || !UUID.test(i.objectId)) throw new InvalidKeyError("Owner and object ids must be UUIDs");
  return `${i.kind}/${i.ownerId}/${i.objectId}.${i.ext}`;
}

export function assertSafeKey(key: string): void {
  if (key.length === 0 || key.length > MAX_KEY_LENGTH) throw new InvalidKeyError("Key length is out of range");
  if (key.startsWith("/") || key.includes("\\")) throw new InvalidKeyError("Key must be a relative path without backslashes");
  if (/[\u0000-\u001f\u007f]/.test(key)) throw new InvalidKeyError("Key contains control characters");
  if (key.split("/").some((part) => part === "" || part === "." || part === "..")) {
    throw new InvalidKeyError("Key contains an empty or relative path segment");
  }
}

export function assertExpiry(seconds: number): void {
  if (!Number.isInteger(seconds) || seconds < 30 || seconds > 3600) {
    throw new InvalidExpiryError("expiresInSeconds must be an integer from 30 to 3600");
  }
}
