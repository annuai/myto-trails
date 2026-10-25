// Uploads one trail's photos and videos (public/photos/<slug>, public/videos/<slug>) to the R2 bucket under public/.
// Safe to re-run. Does not touch the database. Run: npm run media:upload -w @moto-trails/web -- <slug> [--dry-run]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { loadServerEnv } from "../src/server/env";

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const slug = args.find((a) => !a.startsWith("--"));
if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error("usage: upload-trail-media.mts <trail-slug> [--dry-run]");

const { storage } = loadServerEnv(process.env);
if (storage.provider !== "r2") throw new Error("Set STORAGE_PROVIDER=r2 and the R2_* variables in apps/web/.env.local first.");
const client = new S3Client({
  region: "auto",
  endpoint: `https://${storage.accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: storage.accessKeyId, secretAccessKey: storage.secretAccessKey },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const TYPES: Record<string, string> = { ".webp": "image/webp", ".mp4": "video/mp4" };
const root = join(import.meta.dirname, "..", "public");

let count = 0;
let bytes = 0;
for (const kind of ["photos", "videos"]) {
  const dir = join(root, kind, slug);
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir).sort()) {
    const file = join(dir, name);
    const type = TYPES[extname(name)];
    if (!type || !statSync(file).isFile()) continue;
    const body = readFileSync(file);
    count++;
    bytes += body.length;
    if (dry) continue;
    await client.send(new PutObjectCommand({ Bucket: storage.bucket, Key: `public/${kind}/${slug}/${name}`, Body: body, ContentType: type, CacheControl: "public, max-age=31536000, immutable" }));
  }
}
if (count === 0) throw new Error(`Nothing to upload: no files in public/photos/${slug} or public/videos/${slug}`);
console.log(`${dry ? "would upload" : "uploaded"} ${count} files, ${(bytes / 1e6).toFixed(1)} MB, for ${slug}`);
console.log(`example: ${storage.publicBaseUrl}/public/photos/${slug}/photo-1-800.webp`);
