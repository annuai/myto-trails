// Cuts the first and last stretch off a recorded GPX track before it is published (a track that starts at home would
// reveal where you live). Writes a plain GPX 1.1 copy: no timestamps, no device data.
// Run: npx tsx scripts/trim-gpx.mts <in.gpx> <out.gpx> [--start-km 2] [--end-km 2]
import { readFileSync, writeFileSync } from "node:fs";
import { parseGpx } from "../src/server/gpx/parse";
import { trimTrack } from "../src/server/gpx/trim";
import { writeGpx } from "../src/server/gpx/write";

const args = process.argv.slice(2);
const flag = (name: string, fallback: number) => {
  const i = args.indexOf(name);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};
const [input, output] = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!input || !output) throw new Error("usage: trim-gpx.mts <in.gpx> <out.gpx> [--start-km 2] [--end-km 2]");

const parsed = parseGpx(readFileSync(input, "utf8"));
if (!parsed.ok) throw new Error(`Not a usable GPX: ${parsed.error}`);
const all = parsed.tracks.flat();
const kept = trimTrack(all, { startKm: flag("--start-km", 2), endKm: flag("--end-km", 2) });
writeFileSync(output, writeGpx({ name: parsed.name?.slice(0, 120) || "Track", points: kept, waypoints: [] }));
console.log(`kept ${kept.length} of ${all.length} points -> ${output}`);
console.log(`new start ${kept[0]!.lat.toFixed(5)}, ${kept[0]!.lon.toFixed(5)}  new end ${kept[kept.length - 1]!.lat.toFixed(5)}, ${kept[kept.length - 1]!.lon.toFixed(5)}`);
