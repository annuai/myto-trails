// Turns photos into the site's WebP variants (EXIF removed) under public/photos/<slug>/ and prints the media JSON.
// Run: [START=3] npx tsx scripts/make-trail-photos.mts <slug> <file>...   (JPEG, PNG, WebP or AVIF; convert HEIC first;
// START numbers the output files from START+1 so photos can be added to an existing trail)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { processImage } from "../src/server/media/image";

const [slug, ...files] = process.argv.slice(2);
if (!slug || files.length === 0) throw new Error("usage: make-trail-photos.mts <slug> <file>...");
const start = Number(process.env.START ?? 0);
const dir = `public/photos/${slug}`;
mkdirSync(dir, { recursive: true });

const out = [];
for (const [i, file] of files.entries()) {
  const r = await processImage(new Uint8Array(readFileSync(file)));
  if (!r.ok) throw new Error(`${file}: ${r.message}`);
  const variants: Record<string, string> = {};
  for (const v of r.variants.filter((x) => x.format === "webp")) {
    writeFileSync(`${dir}/photo-${start + i + 1}-${v.width}.webp`, v.bytes);
    variants[String(v.width)] = `/photos/${slug}/photo-${start + i + 1}-${v.width}.webp`;
  }
  out.push({ variants, width: r.width, height: r.height });
}
console.log(JSON.stringify(out, null, 2));
