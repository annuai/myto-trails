// Uploads bike pictures: for each <slug>.png|webp|jpg in the folder, re-encodes WebP widths 400/800/1200 (transparency kept,
// metadata stripped), stores them in R2 as public/bike/<slug>-<width>.webp and records them on the model. Safe to re-run.
// Run: npm run bikes:upload -w @moto-trails/web -- data/bikes/images [--dry-run]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { createSql } from "../src/server/db/client";
import { bikeImageKey, slugOfImageFile, variantWidths } from "../src/server/community/bike-catalogue";
import { getStorage } from "../src/server/storage";

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const dir = args.find((a) => !a.startsWith("--"));
if (!dir) throw new Error("usage: bikes-upload.mts <folder> [--dry-run]");

const files = readdirSync(dir).sort();
const todo = files.flatMap((name) => {
  const slug = slugOfImageFile(name);
  return slug ? [{ name, slug }] : [];
});
for (const name of files) if (!slugOfImageFile(name) && !name.startsWith(".")) console.warn(`skipped ${name}: not named <slug>.png, .webp or .jpg`);
if (!todo.length) throw new Error(`No <slug>.png|webp|jpg files in ${dir}`);

const storage = dry ? null : getStorage();
if (storage && storage.name !== "r2") throw new Error("Set STORAGE_PROVIDER=r2 and the R2_* variables in apps/web/.env.local first.");
const sql = dry ? null : createSql(process.env.DATABASE_URL ?? (() => { throw new Error("DATABASE_URL is not set (apps/web/.env.local)"); })());
const version = Math.floor(Date.now() / 1000);
let done = 0;
let bytes = 0;
const problems: string[] = [];
try {
  for (const { name, slug } of todo) {
    if (sql) {
      const [m] = await sql`select 1 as ok from bike_model where slug = ${slug}`;
      if (!m) { problems.push(`${name}: no model with slug "${slug}" (add it to the CSV and run bikes:import)`); continue; }
    }
    const source = readFileSync(join(dir, name));
    const meta = await sharp(source).metadata();
    if (!meta.width) { problems.push(`${name}: not a readable image`); continue; }
    const variants: Record<string, string> = {};
    for (const width of variantWidths(meta.width)) {
      // sharp drops metadata (EXIF, ICC, location) unless asked to keep it; the alpha channel stays.
      const out = await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 85, alphaQuality: 100 }).toBuffer();
      bytes += out.length;
      if (storage) {
        const key = bikeImageKey(slug, width);
        await storage.put("public", key, new Uint8Array(out), "image/webp");
        variants[String(width)] = `${storage.publicUrl(key)}?v=${version}`;
      }
    }
    if (sql) await sql`update bike_model set image_variants = ${sql.json(variants)}, image_updated_at = now() where slug = ${slug}`;
    done++;
  }
} finally {
  await sql?.end({ timeout: 5 });
}
for (const p of problems) console.error(p);
console.log(`${dry ? "would upload" : "uploaded"} ${done} of ${todo.length} images, ${(bytes / 1e6).toFixed(1)} MB of WebP`);
if (problems.length) process.exitCode = 1;
