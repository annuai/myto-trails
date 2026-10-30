import fs from "node:fs";
const TOL = 0.01; // degrees, about 1 km
const MIN_AREA = 0.0004; // drop islets under roughly 4 km2
const g = JSON.parse(fs.readFileSync("ne10_ind.geojson", "utf8"));
const r4 = (n) => Math.round(n * 1e4) / 1e4;
function dp(pts, tol) {
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let max = 0, idx = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const area = (ring) => Math.abs(ring.reduce((s, p, i) => { const q = ring[(i + 1) % ring.length]; return s + (p[0] * q[1] - q[0] * p[1]); }, 0) / 2);
const ring = (r) => { const s = dp(r, TOL).map(([x, y]) => [r4(x), r4(y)]); return s.length >= 4 ? s : null; };
const polys = (geom) => (geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates);
const out = [];
for (const f of g.features) {
  const iso2 = f.properties.ISO_A2_EH;
  if (!/^[A-Z]{2}$/.test(iso2)) continue;
  const parts = [];
  for (const p of polys(f.geometry)) {
    if (area(p[0]) < MIN_AREA) continue;
    const outer = ring(p[0]); if (!outer) continue;
    parts.push([outer, ...p.slice(1).filter((h) => area(h) > MIN_AREA).map(ring).filter(Boolean)]);
  }
  if (!parts.length) { // tiny country: keep its largest polygon unsimplified
    const big = polys(f.geometry).sort((a, b) => area(b[0]) - area(a[0]))[0];
    parts.push([big[0].map(([x, y]) => [r4(x), r4(y)])]);
  }
  out.push({ type: "Feature", properties: { iso2, name: f.properties.NAME }, geometry: { type: "MultiPolygon", coordinates: parts } });
}
const merged = new Map();
for (const f of out) {
  const have = merged.get(f.properties.iso2);
  if (have) have.geometry.coordinates.push(...f.geometry.coordinates);
  else merged.set(f.properties.iso2, f);
}
fs.writeFileSync("countries.geojson", JSON.stringify({ type: "FeatureCollection", features: [...merged.values()] }));
console.log(merged.size, "countries");
