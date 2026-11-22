// Shared by build.mjs (HTML) and build-pptx.mjs (PowerPoint): parses deck-content.md, resolves {{model}} placeholders.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runAll, SCENARIOS, SHARED, RAISE, inr, inrShort, MONTHS } from "../model.mjs";

export const here = dirname(fileURLToPath(import.meta.url));
// DECK=pitch (investor pitch) and DECK=grant (grant application, one slide per form question) reuse the same layouts, model and assets.
const DECKS = {
  strategy: { src: "deck-content.md", html: "index.html", out: "myto-strategy-deck", title: "Myto strategy deck" },
  pitch: { src: "deck-pitch.md", html: "index-pitch.html", out: "myto-pitch-deck", title: "Myto investor pitch" },
  grant: { src: "deck-grant.md", html: "index-grant.html", out: "myto-grant-deck", title: "Myto grant application" },
};
// An unknown DECK would silently build the strategy deck under the wrong name, so it fails instead.
if (process.env.DECK && !DECKS[process.env.DECK]) throw new Error(`Unknown DECK "${process.env.DECK}" (use ${Object.keys(DECKS).join(", ")})`);
export const DECK = process.env.DECK || "strategy";
export const DECK_CFG = DECKS[DECK];
const md = readFileSync(join(here, DECK_CFG.src), "utf8");
export const model = runAll();
// Largest cumulative loss over the year, as a positive number: the cash a scenario needs before founder and team pay.
for (const r of Object.values(model.scenarios)) { let a = 0, lo = 0; for (const x of r.rows) { a += x.net; lo = Math.min(lo, a); } r.peakDeficit = -lo; }

// ---------- formatting and placeholders ----------
const FMT = {
  inr: (v) => inr(v), short: (v) => inrShort(v),
  num: (v) => Number(v).toLocaleString("en-IN"), cr: (v) => `₹${(v / 1e7).toFixed(1)} Cr`, lakh: (v) => `₹${(v / 1e5).toFixed(1)} L`, pct: (v) => Math.round(v * 100) + "%", raw: (v) => String(v),
};
function resolvePath(path) {
  const p = path.split(".");
  if (p[0] === "in") return p.slice(2).reduce((o, k) => o?.[k], SCENARIOS[p[1]]);
  if (p[0] === "shared") return SHARED[p[1]];
  if (p[0] === "raise") { if (!(p[1] in RAISE)) throw new Error(`Unknown model path: ${path}`); return RAISE[p[1]]; }
  const r = model.scenarios[p[0]];
  if (!r) throw new Error(`Unknown model path: ${path}`);
  const v = p.slice(1).reduce((o, k) => o?.[k], r);
  if (v === undefined) throw new Error(`Unknown model path: ${path}`);
  return v;
}
const fill = (s) => s.replace(/\{\{\s*([\w.]+)\s*(?:\|\s*(\w+))?\s*\}\}/g, (_, path, f) => (FMT[f || "raw"])(resolvePath(path)));

// ---------- parse ----------
const sections = md.split(/^## /m).slice(1);
export const slides = [];
for (const sec of sections) {
  const [head, ...lines] = sec.split("\n");
  const [num, layout] = head.split("|").map((x) => x.trim());
  const d = { n: Number(num), layout }; let key = null;
  for (const raw of lines) {
    const l = raw.replace(/\s+$/, ""); if (!l.trim()) continue;
    const m = l.match(/^([a-z_]+):\s?(.*)$/);
    if (m && !l.startsWith("- ")) { key = m[1]; d[key] ??= []; if (m[2]) d[key].push(fill(m[2])); }
    else if (l.startsWith("- ") && key) d[key].push(fill(l.slice(2)));
  }
  slides.push(d);
}
slides.sort((a, b) => a.n - b.n);
export const cells = (s) => s.split(" | ").map((x) => x.trim());
export const one = (d, k) => (d[k] && d[k][0]) || "";
// Text that lives in the layout code rather than deck-content.md; kept here so both outputs use one copy.
export const ARCH = [["Participants", "Never pay, in any group ride"], ["Free for everyone", "Explore, Ride, Fix-it, clubs, rides to 5"], ["Organiser pays", "Large Ride Pass, Myto Organiser"], ["Shop, outside the app", "Originals and curated, physical goods"], ["Partner pays", "Labelled sponsored challenges"]];
export const TRAILS_NOTE = "All four are in Karnataka. Six further trails in the seed data are flagged sample and are not coverage.";
