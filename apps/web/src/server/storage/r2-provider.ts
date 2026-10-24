import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageConfig } from "../env";
import { assertExpiry, assertSafeKey, sanitizeDownloadFilename } from "./keys";
import type { StorageBucket, StorageProvider, UploadTarget } from "./types";

type R2Config = Extract<StorageConfig, { provider: "r2" }>;

/**
 * Cloudflare R2 through its S3-compatible API. One R2 bucket; the logical buckets are key prefixes
 * (`quarantine/`, `originals/`, `public/`). Uploads sign content-type and content-length, so the client
 * must send exactly what was declared.
 */
export function createR2Provider(config: R2Config): StorageProvider {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    // R2 does not accept the SDK's default CRC32 checksum parameters on presigned requests.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  const objectKey = (bucket: StorageBucket, key: string): string => {
    assertSafeKey(key);
    return `${bucket}/${key}`;
  };

  return {
    name: "r2",

    async createUploadUrl(i): Promise<UploadTarget> {
      const Key = objectKey(i.bucket, i.key);
      assertExpiry(i.expiresInSeconds);
      if (!Number.isInteger(i.sizeBytes) || i.sizeBytes <= 0) throw new RangeError("sizeBytes must be a positive integer");
      const url = await getSignedUrl(
        client,
        new PutObjectCommand({ Bucket: config.bucket, Key, ContentType: i.contentType, ContentLength: i.sizeBytes }),
        { expiresIn: i.expiresInSeconds, signableHeaders: new Set(["content-type", "content-length"]) },
      );
      return { url, method: "PUT", headers: { "Content-Type": i.contentType, "Content-Length": String(i.sizeBytes) } };
    },

    async createDownloadUrl(i): Promise<string> {
      const Key = objectKey(i.bucket, i.key);
      assertExpiry(i.expiresInSeconds);
      return getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: config.bucket,
          Key,
          ...(i.downloadFilename
            ? { ResponseContentDisposition: `attachment; filename="${sanitizeDownloadFilename(i.downloadFilename)}"` }
            : {}),
        }),
        { expiresIn: i.expiresInSeconds },
      );
    },

    async head(bucket, key) {
      const Key = objectKey(bucket, key);
      try {
        const res = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key }));
        return { sizeBytes: res.ContentLength ?? 0, contentType: res.ContentType ?? "" };
      } catch (e) {
        const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
        if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) return null;
        throw e;
      }
    },

    async remove(bucket, key) {
      const Key = objectKey(bucket, key);
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key }));
    },

    publicUrl(key) {
      assertSafeKey(key);
      return `${config.publicBaseUrl}/public/${key}`;
    },

    toString: () => "r2",
    toJSON: () => ({ name: "r2" }),
  } as StorageProvider;
}
