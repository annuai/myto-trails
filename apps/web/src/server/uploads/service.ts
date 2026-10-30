import { createHash, randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { GPX_MAX_BYTES, IMAGE_MAX_BYTES } from "@moto-trails/domain";
import { ingestGpx, insertRoute } from "../gpx/ingest";
import { checkOpenCountry } from "../submissions/country";
import { processImage } from "../media/image";
import { buildObjectKey, verifyUpload, type StorageProvider, type UploadTarget } from "../storage";

export type UploadKind = "gpx" | "image";

const GPX_TYPES = ["application/gpx+xml", "application/xml", "text/xml", "application/octet-stream"];
const GPX_CANONICAL = "application/gpx+xml";
const IMAGE_EXT: Record<string, "jpg" | "png" | "webp" | "avif"> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const UPLOADS_PER_HOUR = 30;
const UPLOAD_URL_SECONDS = 900;

const baseType = (t: string) => t.split(";")[0]!.trim().toLowerCase();

export type RequestUploadResult =
  | { ok: true; uploadId: string; target: UploadTarget; contentType: string }
  | { ok: false; reason: "invalid" | "rate_limited" };

/** Creates a pending upload and a signed URL. Browsers often label .gpx as octet-stream, so the type we sign is canonical. */
export async function requestUpload(
  sql: Sql,
  storage: StorageProvider,
  i: { userId: string; kind: UploadKind; contentType: string; sizeBytes: number },
): Promise<RequestUploadResult> {
  const type = baseType(String(i.contentType));
  const max = i.kind === "gpx" ? GPX_MAX_BYTES : i.kind === "image" ? IMAGE_MAX_BYTES : 0;
  const allowed = i.kind === "gpx" ? GPX_TYPES.includes(type) : i.kind === "image" && type in IMAGE_EXT;
  if (!allowed || !Number.isInteger(i.sizeBytes) || i.sizeBytes < 1 || i.sizeBytes > max) return { ok: false, reason: "invalid" };

  const [hit] = await sql`select rate_limit_hit(${`upload:${i.userId}`}, ${UPLOADS_PER_HOUR}, 3600) as ok`;
  if (!hit!.ok) return { ok: false, reason: "rate_limited" };

  const contentType = i.kind === "gpx" ? GPX_CANONICAL : type;
  const uploadId = randomUUID();
  const key = buildObjectKey({ kind: i.kind, ownerId: i.userId, objectId: uploadId, ext: i.kind === "gpx" ? "gpx" : IMAGE_EXT[type]! });
  await sql`
    insert into upload (id, user_id, kind, bucket, storage_key, content_type, size_bytes)
    values (${uploadId}, ${i.userId}, ${i.kind}, 'quarantine', ${key}, ${contentType}, ${i.sizeBytes})`;
  const target = await storage.createUploadUrl({ bucket: "quarantine", key, contentType, sizeBytes: i.sizeBytes, expiresInSeconds: UPLOAD_URL_SECONDS });
  return { ok: true, uploadId, target, contentType };
}

export type UploadOutcome = {
  status: "not_found" | "pending" | "processing" | "ready" | "rejected" | "removed";
  kind?: UploadKind;
  routeId?: string;
  mediaId?: string;
  /** Existing routes that overlap a new GPX; the uploader is warned, never blocked. */
  similar?: { slug: string; name: string; similarity: number }[];
  rejectCode?: string;
  rejectMessage?: string;
};

type UploadRow = {
  id: string;
  kind: UploadKind;
  bucket: "quarantine";
  storage_key: string;
  content_type: string;
  size_bytes: number;
  status: UploadOutcome["status"];
  reject_code: string | null;
  reject_message: string | null;
  route_id: string | null;
  media_id: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const outcomeOf = (u: UploadRow): UploadOutcome => ({
  status: u.status,
  kind: u.kind,
  ...(u.route_id ? { routeId: u.route_id } : {}),
  ...(u.media_id ? { mediaId: u.media_id } : {}),
  ...(u.reject_code ? { rejectCode: u.reject_code, rejectMessage: u.reject_message ?? undefined } : {}),
});

async function load(sql: Sql, userId: string, uploadId: string): Promise<UploadRow | null> {
  if (!UUID.test(uploadId)) return null;
  const [row] = await sql<UploadRow[]>`select id, kind, bucket, storage_key, content_type, size_bytes, status, reject_code, reject_message, route_id, media_id from upload where id = ${uploadId} and user_id = ${userId}`;
  return row ?? null;
}

/** Only the uploader can see an upload. */
export async function getUploadStatus(sql: Sql, userId: string, uploadId: string): Promise<UploadOutcome> {
  const u = await load(sql, userId, uploadId);
  return u ? outcomeOf(u) : { status: "not_found" };
}

async function reject(sql: Sql, storage: StorageProvider, u: UploadRow, code: string, message: string): Promise<UploadOutcome> {
  await storage.remove(u.bucket, u.storage_key);
  await sql`update upload set status = 'rejected', reject_code = ${code}, reject_message = ${message}, processed_at = now() where id = ${u.id}`;
  return { status: "rejected", kind: u.kind, rejectCode: code, rejectMessage: message };
}

const VERIFY_MESSAGES = {
  missing: "The file never arrived. Try uploading it again.",
  too_large: "The file is larger than allowed.",
  size_mismatch: "The uploaded file was not the size it was announced as. Try again.",
  type_not_allowed: "The file type is not allowed.",
} as const;

/** Verifies and processes an upload. Safe to call twice: only one caller wins the pending-to-processing step. */
export async function completeUpload(sql: Sql, storage: StorageProvider, i: { userId: string; uploadId: string }): Promise<UploadOutcome> {
  const existing = await load(sql, i.userId, i.uploadId);
  if (!existing) return { status: "not_found" };
  if (existing.status !== "pending") return outcomeOf(existing);

  const [claimed] = await sql`update upload set status = 'processing' where id = ${existing.id} and status = 'pending' returning id`;
  if (!claimed) return outcomeOf((await load(sql, i.userId, i.uploadId)) ?? existing);

  // Objects written before the database commit; removed again if anything fails, so nothing is orphaned.
  const written: { bucket: "originals" | "public"; key: string }[] = [];
  const put = async (bucket: "originals" | "public", key: string, bytes: Uint8Array, type: string) => {
    await storage.put(bucket, key, bytes, type);
    written.push({ bucket, key });
  };
  try {
    const verified = await verifyUpload(storage, {
      bucket: existing.bucket,
      key: existing.storage_key,
      expectedSizeBytes: existing.size_bytes,
      maxBytes: existing.kind === "gpx" ? GPX_MAX_BYTES : IMAGE_MAX_BYTES,
      allowedContentTypes: [existing.content_type],
    });
    if (!verified.ok) return await reject(sql, storage, existing, verified.reason, VERIFY_MESSAGES[verified.reason]);
    const bytes = await storage.get(existing.bucket, existing.storage_key);
    if (!bytes) return await reject(sql, storage, existing, "missing", VERIFY_MESSAGES.missing);
    return existing.kind === "gpx" ? await processGpx(sql, storage, put, existing, i.userId, bytes) : await processImageUpload(sql, storage, put, existing, i.userId, bytes);
  } catch (err) {
    // Never log file content; the error text alone is enough to diagnose.
    await Promise.allSettled(written.map((w) => storage.remove(w.bucket, w.key)));
    console.error("Upload processing failed", existing.id, err instanceof Error ? err.message : "unknown");
    return reject(sql, storage, existing, "processing_failed", "We couldn't process this file. Please try again.");
  }
}

type PutFn = (bucket: "originals" | "public", key: string, bytes: Uint8Array, type: string) => Promise<void>;

async function processGpx(sql: Sql, storage: StorageProvider, put: PutFn, u: UploadRow, userId: string, bytes: Uint8Array): Promise<UploadOutcome> {
  const ingested = ingestGpx(bytes);
  if (!ingested.ok) return reject(sql, storage, u, ingested.code, ingested.message);
  const country = await checkOpenCountry(sql, ingested.analysis.start);
  if (!country.ok && country.error === "country_not_open") return reject(sql, storage, u, country.error, country.message);

  const originalKey = u.storage_key;
  const cleanKey = originalKey.replace(/\.gpx$/, "-clean.gpx");
  await put("originals", originalKey, bytes, GPX_CANONICAL);
  await put("originals", cleanKey, new TextEncoder().encode(ingested.cleanGpx), GPX_CANONICAL);
  await storage.remove(u.bucket, u.storage_key);

  const result = await sql.begin(async (tx) => {
    const { routeId, simplifiedWkt } = await insertRoute(tx, { ingested, revisionId: null, userId, originalKey, cleanKey, sha256: sha256Hex(bytes), sizeBytes: bytes.byteLength });
    await tx`update upload set status = 'ready', bucket = 'originals', route_id = ${routeId}, processed_at = now() where id = ${u.id}`;
    const similar = await tx`
      select t.slug, rev.name, s.similarity
      from find_similar_routes(ST_GeomFromText(${simplifiedWkt}, 4326), ${routeId}) s
      join route r2 on r2.id = s.route_id
      join trail t on t.published_revision_id = r2.revision_id
      join trail_revision rev on rev.id = t.published_revision_id
      order by s.similarity desc limit 5`;
    return { routeId, similar: similar.map((s) => ({ slug: s.slug as string, name: s.name as string, similarity: Number(s.similarity) })) };
  });
  return { status: "ready", kind: "gpx", routeId: result.routeId, similar: result.similar };
}

async function processImageUpload(sql: Sql, storage: StorageProvider, put: PutFn, u: UploadRow, userId: string, bytes: Uint8Array): Promise<UploadOutcome> {
  const img = await processImage(bytes);
  if (!img.ok) return reject(sql, storage, u, img.error, img.message);

  // Public keys carry the upload id only, never the uploader's account id.
  const stem = u.id;
  const webp: Record<string, string> = {};
  const avif: Record<string, string> = {};
  for (const v of img.variants) {
    const key = `image/${stem}-${v.width}.${v.format}`;
    await put("public", key, v.bytes, `image/${v.format}`);
    (v.format === "webp" ? webp : avif)[String(v.width)] = storage.publicUrl(key);
  }
  await put("originals", u.storage_key, bytes, u.content_type);
  await storage.remove(u.bucket, u.storage_key);

  const mediaId = await sql.begin(async (tx) => {
    const [m] = await tx`
      insert into media (role, alt_text, variants, variants_avif, width, height, uploaded_by, upload_id, placeholder)
      values ('gallery', '', ${tx.json(webp)}, ${tx.json(avif)}, ${img.width}, ${img.height}, ${userId}, ${u.id}, ${img.placeholder})
      returning id`;
    await tx`update upload set status = 'ready', bucket = 'originals', media_id = ${m!.id}, processed_at = now() where id = ${u.id}`;
    return m!.id as string;
  });
  return { status: "ready", kind: "image", mediaId };
}

export const sha256Hex = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
