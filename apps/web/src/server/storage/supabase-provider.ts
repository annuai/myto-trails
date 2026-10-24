import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StorageConfig } from "../env";
import { assertExpiry, assertSafeKey, sanitizeDownloadFilename } from "./keys";
import { STORAGE_BUCKETS, type StorageBucket, type StorageProvider, type UploadTarget } from "./types";

type SupabaseConfig = Extract<StorageConfig, { provider: "supabase" }>;

type StorageErrorLike = { message: string; status?: number; statusCode?: string };

const isNotFound = (e: StorageErrorLike) => e.status === 404 || e.statusCode === "404" || /not found/i.test(e.message);

function newClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const bucketName = (config: SupabaseConfig, bucket: StorageBucket) => `${config.bucketPrefix}-${bucket}`;

/**
 * Supabase Storage. Logical buckets map to Supabase buckets named `<prefix>-quarantine|originals|public`
 * (only `public` is publicly readable). Limitations callers must respect:
 * - Supabase cannot bind upload size or content type when signing, so always run `verifyUpload` afterwards.
 * - Signed upload URLs are valid for a fixed 2 hours; `expiresInSeconds` is validated but cannot shorten that.
 */
export function createSupabaseProvider(config: SupabaseConfig, client: SupabaseClient = newClient(config)): StorageProvider {
  const from = (bucket: StorageBucket) => client.storage.from(bucketName(config, bucket));

  return {
    name: "supabase",

    async createUploadUrl(i): Promise<UploadTarget> {
      assertSafeKey(i.key);
      assertExpiry(i.expiresInSeconds);
      if (!Number.isInteger(i.sizeBytes) || i.sizeBytes <= 0) throw new RangeError("sizeBytes must be a positive integer");
      const { data, error } = await from(i.bucket).createSignedUploadUrl(i.key);
      if (error || !data) throw new Error(`Could not create upload URL: ${error?.message ?? "no data"}`);
      return { url: data.signedUrl, method: "PUT", headers: { "Content-Type": i.contentType, "x-upsert": "false" } };
    },

    async createDownloadUrl(i): Promise<string> {
      assertSafeKey(i.key);
      assertExpiry(i.expiresInSeconds);
      const options = i.downloadFilename ? { download: sanitizeDownloadFilename(i.downloadFilename) } : undefined;
      const { data, error } = await from(i.bucket).createSignedUrl(i.key, i.expiresInSeconds, options);
      if (error || !data) throw new Error(`Could not create download URL: ${error?.message ?? "no data"}`);
      return data.signedUrl;
    },

    async head(bucket, key) {
      assertSafeKey(key);
      const { data, error } = await from(bucket).info(key);
      if (error) {
        if (isNotFound(error as StorageErrorLike)) return null;
        throw new Error(error.message);
      }
      if (!data) return null;
      return { sizeBytes: data.size ?? 0, contentType: data.contentType ?? "" };
    },

    async get(bucket, key) {
      assertSafeKey(key);
      const { data, error } = await from(bucket).download(key);
      if (error) {
        if (isNotFound(error as StorageErrorLike)) return null;
        throw new Error(error.message);
      }
      return data ? new Uint8Array(await data.arrayBuffer()) : null;
    },

    async remove(bucket, key) {
      assertSafeKey(key);
      const { error } = await from(bucket).remove([key]);
      if (error) throw new Error(`Could not remove object: ${error.message}`);
    },

    publicUrl(key) {
      assertSafeKey(key);
      return `${config.url.replace(/\/+$/, "")}/storage/v1/object/public/${bucketName(config, "public")}/${key}`;
    },

    toString: () => "supabase",
    toJSON: () => ({ name: "supabase" }),
  } as StorageProvider;
}

/** Creates any missing buckets (idempotent). Only the `public` bucket is public. */
export async function ensureSupabaseBuckets(config: SupabaseConfig, client: SupabaseClient = newClient(config)): Promise<void> {
  for (const logical of STORAGE_BUCKETS) {
    const name = bucketName(config, logical);
    const { data } = await client.storage.getBucket(name);
    if (data) continue;
    const { error } = await client.storage.createBucket(name, { public: logical === "public" });
    if (error) throw new Error(`Could not create bucket ${name}: ${error.message}`);
  }
}
