/** The buckets: quarantine holds files not yet checked, public holds what the site serves, and originals holds the kept originals. */
export const STORAGE_BUCKETS = ["quarantine", "originals", "public"] as const;
export type StorageBucket = (typeof STORAGE_BUCKETS)[number];

/** Where and how a client sends a file. */
export type UploadTarget = { url: string; method: "PUT"; headers: Record<string, string> };

/** What every storage backend offers, such as signed upload addresses and reading files. */
export interface StorageProvider {
  readonly name: "memory" | "local" | "r2" | "supabase";
  /** Signed URL the client PUTs the file to. Callers must still run verifyUpload afterwards. */
  createUploadUrl(i: {
    bucket: StorageBucket;
    key: string;
    contentType: string;
    sizeBytes: number;
    expiresInSeconds: number;
  }): Promise<UploadTarget>;
  createDownloadUrl(i: {
    bucket: StorageBucket;
    key: string;
    expiresInSeconds: number;
    downloadFilename?: string;
  }): Promise<string>;
  head(bucket: StorageBucket, key: string): Promise<{ sizeBytes: number; contentType: string } | null>;
  /** Stores bytes from the server (used by processing jobs). */
  put(bucket: StorageBucket, key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  /** The object's bytes, or null when it does not exist. */
  get(bucket: StorageBucket, key: string): Promise<Uint8Array | null>;
  remove(bucket: StorageBucket, key: string): Promise<void>;
  /** Public URL for an object in the `public` bucket only. */
  publicUrl(key: string): string;
}

/** A storage key that is not safe. */
export class InvalidKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidKeyError";
  }
}

/** A signed-address lifetime outside the allowed range. */
export class InvalidExpiryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidExpiryError";
  }
}
