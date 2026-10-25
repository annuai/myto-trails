// Checks a trail data file against the import rules without touching any database or storage.
// Run: npm run trail:validate -w @moto-trails/web -- data/trails/<slug>.json
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { TrailImportSchema } from "../src/server/import/schema";

const file = process.argv[2];
if (!file) throw new Error("usage: validate-trail.mts <file.json>");
const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
let bad = 0;
for (const record of Array.isArray(raw) ? raw : [raw]) {
  const r = TrailImportSchema.safeParse(record);
  const label = (record as { slug?: string }).slug ?? "(no slug)";
  if (!r.success) {
    bad++;
    console.error(`${label}: INVALID`);
    for (const i of r.error.issues) console.error(`  ${i.path.join(".") || "(record)"}: ${i.message}`);
    continue;
  }
  const t = r.data;
  const problems: string[] = [];
  if (t.gpxFile && !existsSync(join(dirname(file), t.gpxFile))) problems.push(`GPX file not found: ${t.gpxFile}`);
  for (const m of t.media) for (const u of Object.values(m.variants)) if (u.startsWith("/") && !existsSync(join("public", u))) problems.push(`missing photo file: ${u}`);
  for (const v of t.videos) for (const u of [v.mp4, v.poster]) if (u.startsWith("/") && !existsSync(join("public", u))) problems.push(`missing video file: ${u}`);
  if (t.media.length && !t.media.some((m) => m.role === "cover")) problems.push("no photo has role \"cover\"");
  if (problems.length) {
    bad++;
    console.error(`${label}: files`);
    for (const p of problems) console.error(`  ${p}`);
  } else console.log(`${label}: ok (${t.media.length} photos, ${t.videos.length} videos${t.gpxFile ? ", GPX attached" : ""})`);
}
process.exit(bad ? 1 : 0);
