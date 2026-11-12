#!/usr/bin/env node
// Writes web-sized copies of the illustrations to assets/opt/ so the PDF stays small.
// Opaque pictures become JPEG (q86, max 2400 px wide, never upscaled); transparent ones stay WebP at 1400 px.
// Needs `sharp` (repo dev dependency). Skips files that are newer than their source.
import { existsSync, mkdirSync, statSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename, extname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "assets", "opt");
mkdirSync(out, { recursive: true });
let sharp;
try { sharp = (await import("sharp")).default; } catch { console.warn("sharp not found: skipping image optimisation (build falls back to the originals)"); process.exit(0); }
let n = 0;
for (const dir of ["img", "pending"]) {
  for (const f of readdirSync(join(here, "assets", dir))) {
    if (extname(f) !== ".webp") continue;
    const src = join(here, "assets", dir, f);
    const meta = await sharp(src).metadata();
    const ext = meta.hasAlpha ? "webp" : "jpg";
    const dst = join(out, basename(f, ".webp") + "." + ext);
    if (existsSync(dst) && statSync(dst).mtimeMs > statSync(src).mtimeMs) continue;
    let p = sharp(src).resize({ width: meta.hasAlpha ? 1400 : 2400, withoutEnlargement: true });
    p = meta.hasAlpha ? p.webp({ quality: 88 }) : p.jpeg({ quality: 86, mozjpeg: true });
    await p.toFile(dst); n++;
  }
}
console.log(`assets/opt: ${n} written`);
