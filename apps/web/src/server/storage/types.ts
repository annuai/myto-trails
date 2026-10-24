export const STORAGE_BUCKETS = ["quarantine", "originals", "public"] as const;
export type StorageBucket = (typeof STORAGE_BUCKETS)[number];

export type UploadTarget = { url: string; method: "PUT"; headers: Record<string, string> };

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
  /** The object's bytes, or null when it does not exist. */
  get(bucket: StorageBucket, key: string): Promise<Uint8Array | null>;
  remove(bucket: StorageBucket, key: string): Promise<void>;
  /** Public URL for an object in the `public` bucket only. */
  publicUrl(key: string): string;
}

export class InvalidKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidKeyError";
  }
}

export class InvalidExpiryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidExpiryError";
  }
}
