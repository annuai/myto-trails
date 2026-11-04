// Starts a trail's data file in one command: copies the template, trims the GPX ends, makes the photo and video files,
// puts the media into the file, and runs the validator. What it cannot know (the summary, access, hazards, alt text) is
// left as the template's placeholder text, listed at the end so nothing ships by accident.
//
// Run: npm run trail:prepare -w @moto-trails/web -- <slug> --name "Trail name" --credit "Rider name" \
//        [--gpx in.gpx --trim-start-km 2 --trim-end-km 2] [-p photo...] [-v video...] --plates-checked
// Photos and videos are refused unless you pass --plates-checked: blur number plates and faces first (see the runbook).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { parseGpx } from "../src/server/gpx/parse";
import { trimTrack } from "../src/server/gpx/trim";
import { writeGpx } from "../src/server/gpx/write";

const argv = process.argv.slice(2);
const slug = argv[0] ?? "";
const flag = (n: string) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const list = (n: string) => { const i = argv.indexOf(n); if (i < 0) return []; const out: string[] = []; for (const a of argv.slice(i + 1)) { if (a.startsWith("-")) break; out.push(a); } return out; };
const die: (m: string) => never = (m) => { console.error(m); process.exit(1); };

if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) die("usage: trail:prepare <slug> --name \"Trail name\" --credit \"Rider name\" [--gpx f] [-p photos...] [-v videos...] --plates-checked\n(slug: lowercase letters, digits and single hyphens)");
const file = `data/trails/${slug}.json`;
if (existsSync(file)) die(`${file} already exists. Edit it by hand, or delete it to start again.`);
const photos = list("-p");
const videos = list("-v");
if ((photos.length || videos.length) && !argv.includes("--plates-checked")) {
  die(["Photos and videos are published. Before they are made, check each one for:",
    "  - number plates (scripts/blur-photo-region.mts, scripts/redact-video-plate.py)",
    "  - faces, house numbers, people's names",
    "  - voices in videos (mute or leave out clips with conversations)",
    "Pass the blurred files, and add --plates-checked to confirm you did this."].join("\n"));
}
for (const f of [...photos, ...videos, ...(flag("--gpx") ? [flag("--gpx")!] : [])]) if (!existsSync(f)) die(`not found: ${f}`);

const trail = JSON.parse(readFileSync("data/trails/_template.json", "utf8")) as Record<string, unknown>;
trail.slug = slug;
trail.name = flag("--name") ?? trail.name;
trail.contributorCredit = flag("--credit") ?? trail.contributorCredit;
trail.condition = { ...(trail.condition as object), effectiveFrom: new Date().toISOString().slice(0, 10) };

mkdirSync("data/trails/gpx", { recursive: true });
const gpx = flag("--gpx");
if (gpx) {
  const parsed = parseGpx(readFileSync(gpx, "utf8"));
  if (!parsed.ok) die(`Not a usable GPX: ${parsed.error}`);
  const all = parsed.tracks.flat();
  const kept = trimTrack(all, { startKm: Number(flag("--trim-start-km") ?? 2), endKm: Number(flag("--trim-end-km") ?? 2) });
  writeFileSync(`data/trails/gpx/${slug}.gpx`, writeGpx({ name: (flag("--name") ?? parsed.name ?? slug).slice(0, 120), points: kept, waypoints: [] }));
  trail.gpxFile = `gpx/${slug}.gpx`;
  const first = kept[0]!;
  trail.startPoint = { lon: Number(first.lon.toFixed(5)), lat: Number(first.lat.toFixed(5)) };
  console.log(`GPX: kept ${kept.length} of ${all.length} points. New start ${first.lat.toFixed(5)}, ${first.lon.toFixed(5)}; new end ${kept.at(-1)!.lat.toFixed(5)}, ${kept.at(-1)!.lon.toFixed(5)}. Check neither is near your home.`);
} else {
  delete trail.gpxFile;
}

const tmp = join(tmpdir(), `prepare-${slug}-${process.pid}`);
mkdirSync(tmp, { recursive: true });
const credit = String(trail.contributorCredit);
if (photos.length) {
  const jpgs = photos.map((f) => {
    if (!/\.(heic|heif)$/i.test(f)) return f;
    const out = join(tmp, `${basename(f, extname(f))}.jpg`);
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "90", f, "--out", out], { stdio: "ignore" });
    return out;
  });
  const made = JSON.parse(execFileSync("npx", ["tsx", "scripts/make-trail-photos.mts", slug, ...jpgs], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] })) as { variants: Record<string, string>; width: number; height: number }[];
  trail.media = made.map((m, i) => ({ role: i === 0 ? "cover" : "gallery", position: i, altText: "TODO: say what is in this picture, for people who cannot see it", credit, ...m }));
} else trail.media = [];
const made: unknown[] = [];
for (const [i, v] of videos.entries()) {
  const m = JSON.parse(execFileSync("npx", ["tsx", "scripts/make-trail-video.mts", slug, String(i + 1), v], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] })) as Record<string, unknown>;
  delete m.sizeMb;
  made.push({ position: i, description: "TODO: what the clip shows", credit, ...m });
}
trail.videos = made;

writeFileSync(file, `${JSON.stringify(trail, null, 2)}\n`);
console.log(`\nWrote ${file}\n`);
const text = readFileSync(file, "utf8");
const todo = [...text.matchAll(/"([^"]+)": "((?:TODO|Replace with|One or two sentences|Optional longer|District name|Nearest town|Who may ride|What can go wrong|What the ground|When it is best|Anything riders|Ridden by the contributor)[^"]*)"/g)].map((m) => m[1]);
console.log(`Still to fill in by hand (${todo.length} fields): ${[...new Set(todo)].join(", ")}.`);
console.log("Also set: state, difficulty, terrain, hazards, bestMonths, and keep access level community_reported until you or a moderator verify it.\n");
try { execFileSync("npx", ["tsx", "scripts/validate-trail.mts", file], { stdio: "inherit" }); } catch { console.log("\nThe validator lists what still needs fixing; run it again after editing:\n  npm run trail:validate -w @moto-trails/web -- " + file); }
console.log(`Then upload and import: see docs/runbooks/add-a-trail.md, step 5.`);
