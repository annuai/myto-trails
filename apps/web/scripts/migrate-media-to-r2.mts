// One-off: uploads public/photos and public/videos to R2 under public/ and points the database rows at the R2 URLs.
// Safe to re-run. Run: npm run media:migrate -w @moto-trails/web   (add --dry-run to list what would happen)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createSql } from "../src/server/db/client";
import { loadServerEnv } from "../src/server/env";
import { resolveMediaUrl } from "../src/server/import/media-url";

const dry = process.argv.includes("--dry-run");
const { storage } = loadServerEnv(process.env);
if (storage.provider !== "r2") throw new Error("Set STORAGE_PROVIDER=r2 and the R2_* variables first.");
const client = new S3Client({
  region: "auto",
  endpoint: `https://${storage.accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: storage.accessKeyId, secretAccessKey: storage.secretAccessKey },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const TYPES: Record<string, string> = { ".webp": "image/webp", ".mp4": "video/mp4", ".jpg": "image/jpeg", ".png": "image/png" };

const root = join(import.meta.dirname, "..", "public");
const files: string[] = [];
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (TYPES[extname(name)]) files.push(p);
  }
};
for (const d of ["photos", "videos"]) walk(join(root, d));

let bytes = 0;
for (const f of files) {
  const rel = relative(root, f).split("\\").join("/");
  const body = readFileSync(f);
  bytes += body.length;
  if (dry) continue;
  await client.send(new PutObjectCommand({
    Bucket: storage.bucket, Key: `public/${rel}`, Body: body, ContentType: TYPES[extname(f)]!, CacheControl: "public, max-age=31536000, immutable",
  }));
}
console.log(`${dry ? "would upload" : "uploaded"} ${files.length} files, ${(bytes / 1e6).toFixed(1)} MB`);

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = createSql(url);
let rows = 0;
for (const m of await sql`select id, variants from media`) {
  const next = Object.fromEntries(Object.entries(m.variants as Record<string, string>).map(([k, u]) => [k, resolveMediaUrl(u, storage.publicBaseUrl)]));
  if (JSON.stringify(next) !== JSON.stringify(m.variants)) {
    rows++;
    if (!dry) await sql`update media set variants = ${sql.json(next)} where id = ${m.id}`;
  }
}
for (const v of await sql`select id, mp4_url, poster_url from trail_video`) {
  const mp4 = resolveMediaUrl(v.mp4_url, storage.publicBaseUrl);
  const poster = resolveMediaUrl(v.poster_url, storage.publicBaseUrl);
  if (mp4 !== v.mp4_url || poster !== v.poster_url) {
    rows++;
    if (!dry) await sql`update trail_video set mp4_url = ${mp4}, poster_url = ${poster} where id = ${v.id}`;
  }
}
console.log(`${dry ? "would update" : "updated"} ${rows} database rows`);
await sql.end();
