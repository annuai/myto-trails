// Builds assets/countries/boundaries.json for the app from the website's country outlines (apps/web/data/boundaries).
// The app carries full outlines only for countries whose emergency number we have checked (COUNTRY_CONFIGS), so the number can be
// chosen with no signal, plus a bounding box for every country so the map can open on the browsing country.
// Run: npm run assets:countries -w @moto-trails/mobile
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COUNTRY_CONFIGS } from '@moto-trails/domain';

type Ring = [number, number][];
type Feature = { properties: { iso2: string }; geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: Ring[] | Ring[][] } };

const SOURCE = fileURLToPath(new URL('../../web/data/boundaries/countries.geojson', import.meta.url));
const TARGET = fileURLToPath(new URL('../assets/countries/boundaries.json', import.meta.url));
const TOLERANCE_DEG = 0.02; // about 2 km: well inside the margin where we say "check the number" anyway
const BIG_PART = 0.05; // a polygon counts for the bounding box when it is at least this share of the country's largest

const round = (n: number) => Math.round(n * 1e3) / 1e3;
const area = (r: Ring) => Math.abs(r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]!; return s + (p[0] * q[1] - q[0] * p[1]); }, 0) / 2);

function simplify(pts: Ring, tol: number): Ring {
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = pts[a]!, [bx, by] = pts[b]!;
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i]!;
      const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const polygons = (f: Feature): Ring[][] => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates as Ring[]] : (f.geometry.coordinates as Ring[][]));
const boxOf = (rings: Ring[]): [number, number, number, number] => {
  const xs = rings.flatMap((r) => r.map((p) => p[0])), ys = rings.flatMap((r) => r.map((p) => p[1]));
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(round) as [number, number, number, number];
};

const features = (JSON.parse(readFileSync(SOURCE, 'utf8')) as { features: Feature[] }).features;
const countries: Record<string, Ring[][]> = {};
const bboxes: Record<string, [number, number, number, number]> = {};
for (const f of features) {
  const iso2 = f.properties.iso2;
  const parts = polygons(f);
  const largest = Math.max(...parts.map((p) => area(p[0]!)));
  const main = parts.filter((p) => area(p[0]!) >= largest * BIG_PART).map((p) => p[0]!);
  const box = boxOf(main);
  if (box[2] - box[0] <= 180) bboxes[iso2] = box; // a country that wraps the date line has no useful box
  if (COUNTRY_CONFIGS[iso2]) {
    countries[iso2] = parts
      .map((p) => p.map((r) => simplify(r, TOLERANCE_DEG).map(([x, y]) => [round(x), round(y)] as [number, number])).filter((r) => r.length >= 4))
      .filter((p) => p.length > 0);
  }
}
const missing = Object.keys(COUNTRY_CONFIGS).filter((c) => !countries[c]);
if (missing.length) throw new Error(`No outline for ${missing.join(', ')}`);
writeFileSync(TARGET, JSON.stringify({ countries, bboxes }));
console.log(`${Object.keys(countries).length} outlines, ${Object.keys(bboxes).length} boxes`);
