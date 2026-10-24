// Generates the fictional sample tracks in data/gpx (deterministic). Run: npx tsx scripts/make-sample-gpx.mts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

type Sample = { slug: string; sensitivity: string; distanceKm?: number; startPoint: { lon: number; lat: number } };
const samples = JSON.parse(readFileSync("data/sample-trails.json", "utf8")) as Sample[];
mkdirSync("data/gpx", { recursive: true });

// A winding climb of about `km` kilometres: heading drifts smoothly, 40 m between points, elevation rises then dips.
function track(start: { lon: number; lat: number }, km: number, seed: number) {
  const pts: { lat: number; lon: number; ele: number }[] = [];
  let { lat, lon } = start;
  let heading = (seed * 0.9) % (2 * Math.PI);
  const n = Math.round((km * 1000) / 40);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    heading += Math.sin(i / 23 + seed) * 0.04;
    lat += (Math.cos(heading) * 40) / 111_320;
    lon += (Math.sin(heading) * 40) / (111_320 * Math.cos((lat * Math.PI) / 180));
    pts.push({ lat, lon, ele: 800 + 450 * Math.sin(t * Math.PI * 0.9) + 25 * Math.sin(i / 9) });
  }
  return pts;
}

samples
  .filter((s) => s.sensitivity === "standard")
  .forEach((s, k) => {
    const pts = track(s.startPoint, Math.min(s.distanceKm ?? 10, 20), k + 1);
    const body = pts.map((p) => `<trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}"><ele>${p.ele.toFixed(1)}</ele></trkpt>`).join("");
    writeFileSync(`data/gpx/${s.slug}.gpx`, `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Moto Trails sample generator" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${s.slug} (fictional)</name><trkseg>${body}</trkseg></trk></gpx>\n`);
  });
