// Uploads Fix it pictures. For each picture id the app uses (flat-tyre-tubeless/plug), looks in the folder for flat-tyre-tubeless-plug.png|webp|jpg,
// re-encodes WebP widths 400/800/1200 (metadata stripped), stores them in R2 as public/fixit/<guide>/<slot>-<width>.webp and records them on the
// picture's row. Safe to re-run. Run: npm run fixit:art -w @moto-trails/web -- <folder> [--dry-run]
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { fixitArtKey } from "@moto-trails/domain";
import { FIXIT_ART_ALT } from "@moto-trails/domain/fixit-seed";
import { createSql } from "../src/server/db/client";
import { FIXIT_ART_WIDTHS } from "../src/server/fixit/fixit";
import { getStorage } from "../src/server/storage";

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const dir = args.find((a) => !a.startsWith("--"));
if (!dir) throw new Error("usage: fixit-art.mts <folder> [--dry-run]");

const found = Object.keys(FIXIT_ART_ALT).flatMap((id) => {
  const base = id.replace("/", "-");
  const ext = ["webp", "png", "jpg", "jpeg"].find((e) => existsSync(join(dir, `${base}.${e}`)));
  return ext ? [{ id, file: join(dir, `${base}.${ext}`) }] : [];
});
for (const id of Object.keys(FIXIT_ART_ALT)) if (!found.some((f) => f.id === id)) console.log(`no file yet for ${id}`);
if (!found.length) throw new Error(`No picture files for any known id in ${dir} (expected names like flat-tyre-tubeless-plug.webp)`);

const storage = dry ? null : getStorage();
if (storage && storage.name !== "r2") throw new Error("Set STORAGE_PROVIDER=r2 and the R2_* variables in apps/web/.env.local first.");
const sql = dry ? null : createSql(process.env.DATABASE_URL ?? (() => { throw new Error("DATABASE_URL is not set (apps/web/.env.local)"); })());
const version = Math.floor(Date.now() / 1000);
let done = 0;
let bytes = 0;
try {
  for (const { id, file } of found) {
    const source = readFileSync(file);
    const meta = await sharp(source).metadata();
    if (!meta.width) { console.error(`${file}: not a readable image`); process.exitCode = 1; continue; }
    const widths = FIXIT_ART_WIDTHS.filter((w) => w <= meta.width!);
    const variants: Record<string, string> = {};
    for (const width of widths.length ? widths : [meta.width]) {
      const out = await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
      bytes += out.length;
      if (storage) {
        const key = fixitArtKey(id, width);
        await storage.put("public", key, new Uint8Array(out), "image/webp");
        variants[String(width)] = `${storage.publicUrl(key)}?v=${version}`;
      }
    }
    if (sql) await sql`update fixit_art set variants = ${sql.json(variants)} where id = ${id}`;
    done++;
  }
} finally {
  await sql?.end({ timeout: 5 });
}
console.log(`${dry ? "would upload" : "uploaded"} ${done} of ${found.length} pictures, ${(bytes / 1e6).toFixed(1)} MB of WebP`);
