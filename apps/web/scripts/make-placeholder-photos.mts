// Generates placeholder "photos" (illustrated landscapes) for the sample trails and the home page hero into
// public/placeholders. Real photos replace these later. Run: npx tsx scripts/make-placeholder-photos.mts
import { mkdirSync, readFileSync } from "node:fs";
import sharp from "sharp";
import { paletteFor } from "../src/ui/PlaceholderArt/PlaceholderArt";

const samples = JSON.parse(readFileSync("data/sample-trails.json", "utf8")) as { slug: string }[];
mkdirSync("public/placeholders", { recursive: true });

function art(slug: string, w: number, h: number, hero = false): string {
  const [sky, far, mid, near] = paletteFor(slug);
  let seed = [...slug].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const ridge = (base: number, amp: number, steps: number) => {
    let d = `M0 ${h}`;
    for (let i = 0; i <= steps; i++) d += ` L${(i / steps) * w} ${base + (rnd() - 0.5) * amp * h}`;
    return d + ` L${w} ${h}z`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <circle cx="${w * (0.2 + rnd() * 0.6)}" cy="${h * 0.25}" r="${h * 0.09}" fill="#fff" opacity="0.7"/>
    <path d="${ridge(h * 0.52, 0.2, 14)}" fill="${far}"/>
    <path d="${ridge(h * 0.64, 0.16, 18)}" fill="${mid}"/>
    <path d="${ridge(h * 0.8, 0.12, 22)}" fill="${near}"/>
    <path d="M${w * 0.1} ${h * 0.98} C ${w * 0.3} ${h * 0.82}, ${w * 0.45} ${h * 0.95}, ${w * 0.62} ${h * 0.86} S ${w * 0.9} ${h * 0.8}, ${w * 0.95} ${h * 0.84}" fill="none" stroke="#f2ede8" stroke-width="${h * 0.012}" stroke-dasharray="${h * 0.03} ${h * 0.025}" opacity="0.8"/>
    ${hero ? "" : ""}
  </svg>`;
}

for (const slug of [...samples.map((s) => s.slug), "generic"]) {
  for (const w of [400, 800, 1600]) await sharp(Buffer.from(art(slug, w, Math.round(w * 0.625)))).webp({ quality: 82 }).toFile(`public/placeholders/${slug}-${w}.webp`);
}
console.log("done");
