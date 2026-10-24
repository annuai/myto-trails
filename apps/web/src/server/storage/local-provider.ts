import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { assertExpiry, assertSafeKey, sanitizeDownloadFilename } from "./keys";
import { InvalidKeyError, type StorageBucket, type StorageProvider, type UploadTarget } from "./types";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

type Payload =
  | { op: "put"; b: StorageBucket; k: string; ct: string; n: number; e: number }
  | { op: "get"; b: StorageBucket; k: string; e: number; f?: string };

export type PutResult = { ok: true } | { ok: false; status: 400 | 403 | 413; reason: string };
export type GetResult =
  | { ok: true; body: Uint8Array; contentType: string; contentDisposition: string | null }
  | { ok: false; status: 400 | 403 | 404; reason: string };

const baseType = (ct: string) => ct.split(";")[0]!.trim().toLowerCase();

/**
 * Files on local disk with HMAC-signed upload and download URLs served by /api/storage/*. For development and
 * tests only: it makes the upload pipeline runnable without any cloud credentials. Never allowed in production.
 */
export class LocalStorageProvider implements StorageProvider {
  readonly name = "local" as const;
  readonly #root: string;
  readonly #secret: string;

  constructor(config: { rootDir: string; secret: string }) {
    this.#root = resolve(config.rootDir);
    this.#secret = config.secret;
  }

  #file(bucket: StorageBucket, key: string): string {
    assertSafeKey(key);
    if (key.endsWith(".meta")) throw new InvalidKeyError("Key may not end with .meta");
    const file = resolve(join(this.#root, bucket, ...key.split("/")));
    if (!file.startsWith(this.#root + sep)) throw new InvalidKeyError("Key escapes the storage root");
    return file;
  }

  #sign(payload: Payload): string {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = createHmac("sha256", this.#secret).update(body).digest("base64url");
    return `${body}.${sig}`;
  }

  #verify(token: string): Payload | null {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [body, sig] = parts as [string, string];
    const expected = createHmac("sha256", this.#secret).update(body).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    try {
      const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
      if ((p.op !== "put" && p.op !== "get") || typeof p.k !== "string" || typeof p.e !== "number" || p.e < Date.now()) return null;
      if (!["quarantine", "originals", "public"].includes(p.b)) return null;
      return p;
    } catch {
      return null;
    }
  }

  writeObject(bucket: StorageBucket, key: string, bytes: Uint8Array, contentType: string): void {
    const file = this.#file(bucket, key);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, bytes);
    writeFileSync(`${file}.meta`, JSON.stringify({ contentType }));
  }

  async createUploadUrl(i: { bucket: StorageBucket; key: string; contentType: string; sizeBytes: number; expiresInSeconds: number }): Promise<UploadTarget> {
    this.#file(i.bucket, i.key);
    assertExpiry(i.expiresInSeconds);
    if (!Number.isInteger(i.sizeBytes) || i.sizeBytes <= 0) throw new RangeError("sizeBytes must be a positive integer");
    const token = this.#sign({ op: "put", b: i.bucket, k: i.key, ct: i.contentType, n: i.sizeBytes, e: Date.now() + i.expiresInSeconds * 1000 });
    return { url: `/api/storage/upload?t=${token}`, method: "PUT", headers: { "Content-Type": i.contentType } };
  }

  async createDownloadUrl(i: { bucket: StorageBucket; key: string; expiresInSeconds: number; downloadFilename?: string }): Promise<string> {
    this.#file(i.bucket, i.key);
    assertExpiry(i.expiresInSeconds);
    const token = this.#sign({
      op: "get", b: i.bucket, k: i.key, e: Date.now() + i.expiresInSeconds * 1000,
      ...(i.downloadFilename ? { f: sanitizeDownloadFilename(i.downloadFilename) } : {}),
    });
    return `/api/storage/download?t=${token}`;
  }

  /** Handles the PUT behind a signed upload URL: key, content type and size must be exactly what was signed. */
  async handlePut(token: string, contentType: string, body: Uint8Array): Promise<PutResult> {
    const p = this.#verify(token);
    if (!p || p.op !== "put") return { ok: false, status: 403, reason: "invalid or expired upload link" };
    if (p.n > MAX_UPLOAD_BYTES) return { ok: false, status: 403, reason: "invalid or expired upload link" };
    if (baseType(contentType) !== baseType(p.ct)) return { ok: false, status: 400, reason: "content type does not match the upload link" };
    if (body.byteLength !== p.n) return { ok: false, status: 400, reason: "size does not match the upload link" };
    this.writeObject(p.b, p.k, body, p.ct);
    return { ok: true };
  }

  async handleGet(token: string): Promise<GetResult> {
    const p = this.#verify(token);
    if (!p || p.op !== "get") return { ok: false, status: 403, reason: "invalid or expired download link" };
    const meta = await this.head(p.b, p.k);
    const body = await this.get(p.b, p.k);
    if (!meta || !body) return { ok: false, status: 404, reason: "not found" };
    return { ok: true, body, contentType: meta.contentType, contentDisposition: p.f ? `attachment; filename="${p.f}"` : null };
  }

  /** Serves files from the public bucket (image variants). */
  async readPublic(key: string): Promise<GetResult> {
    try {
      const meta = await this.head("public", key);
      const body = await this.get("public", key);
      if (!meta || !body) return { ok: false, status: 404, reason: "not found" };
      return { ok: true, body, contentType: meta.contentType, contentDisposition: null };
    } catch (e) {
      if (e instanceof InvalidKeyError) return { ok: false, status: 400, reason: "invalid key" };
      throw e;
    }
  }

  async head(bucket: StorageBucket, key: string): Promise<{ sizeBytes: number; contentType: string } | null> {
    const file = this.#file(bucket, key);
    try {
      const size = statSync(file).size;
      const meta = JSON.parse(readFileSync(`${file}.meta`, "utf8")) as { contentType?: string };
      return { sizeBytes: size, contentType: meta.contentType ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }

  async get(bucket: StorageBucket, key: string): Promise<Uint8Array | null> {
    const file = this.#file(bucket, key);
    try {
      return new Uint8Array(readFileSync(file));
    } catch {
      return null;
    }
  }

  async remove(bucket: StorageBucket, key: string): Promise<void> {
    const file = this.#file(bucket, key);
    rmSync(file, { force: true });
    rmSync(`${file}.meta`, { force: true });
  }

  publicUrl(key: string): string {
    assertSafeKey(key);
    return `/api/storage/public/${key}`;
  }

  toString(): string {
    return "local";
  }
  toJSON() {
    return { name: "local" };
  }
}
