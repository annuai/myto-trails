import { assertExpiry, assertSafeKey } from "./keys";
import type { StorageBucket, StorageProvider, UploadTarget } from "./types";

type Stored = { sizeBytes: number; contentType: string; bytes: Uint8Array };

/** In-memory provider for local development and tests. Signed URLs use a `memory://` scheme and are not fetchable. */
export class MemoryStorageProvider implements StorageProvider {
  readonly name = "memory" as const;
  private readonly objects = new Map<string, Stored>();

  private id(bucket: StorageBucket, key: string): string {
    assertSafeKey(key);
    return `${bucket}/${key}`;
  }

  /** Test and development helper: simulates a completed upload. */
  put(bucket: StorageBucket, key: string, bytes: Uint8Array, contentType: string): void {
    this.objects.set(this.id(bucket, key), { sizeBytes: bytes.byteLength, contentType, bytes: Uint8Array.from(bytes) });
  }

  async createUploadUrl(i: { bucket: StorageBucket; key: string; contentType: string; sizeBytes: number; expiresInSeconds: number }): Promise<UploadTarget> {
    const id = this.id(i.bucket, i.key);
    assertExpiry(i.expiresInSeconds);
    if (!Number.isInteger(i.sizeBytes) || i.sizeBytes <= 0) throw new RangeError("sizeBytes must be a positive integer");
    return {
      url: `memory://upload/${id}`,
      method: "PUT",
      headers: { "Content-Type": i.contentType, "Content-Length": String(i.sizeBytes) },
    };
  }

  async createDownloadUrl(i: { bucket: StorageBucket; key: string; expiresInSeconds: number; downloadFilename?: string }): Promise<string> {
    const id = this.id(i.bucket, i.key);
    assertExpiry(i.expiresInSeconds);
    const name = i.downloadFilename ? `&filename=${encodeURIComponent(i.downloadFilename)}` : "";
    return `memory://download/${id}?expires=${i.expiresInSeconds}${name}`;
  }

  async head(bucket: StorageBucket, key: string): Promise<{ sizeBytes: number; contentType: string } | null> {
    const o = this.objects.get(this.id(bucket, key));
    return o ? { sizeBytes: o.sizeBytes, contentType: o.contentType } : null;
  }

  async get(bucket: StorageBucket, key: string): Promise<Uint8Array | null> {
    const o = this.objects.get(this.id(bucket, key));
    return o ? Uint8Array.from(o.bytes) : null;
  }

  async remove(bucket: StorageBucket, key: string): Promise<void> {
    this.objects.delete(this.id(bucket, key));
  }

  publicUrl(key: string): string {
    assertSafeKey(key);
    return `memory://public/${key}`;
  }

  toString(): string {
    return "memory";
  }
}
