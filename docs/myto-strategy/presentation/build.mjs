#!/usr/bin/env node
// Generates index.html from deck-content.md + ../model.mjs. Dependency-free.
// Usage: node build.mjs   (or `npm run deck:build` from the repo root)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runAll, SCENARIOS, SHARED, inr, inrShort, MONTHS } from "../model.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const md = readFileSync(join(here, "deck-content.md"), "utf8");
const model = runAll();

// ---------- formatting and placeholders ----------
const FMT = {
  inr: (v) => inr(v), short: (v) => inrShort(v),
  num: (v) => Number(v).toLocaleString("en-IN"), pct: (v) => Math.round(v * 100) + "%", raw: (v) => String(v),
};
function resolvePath(path) {
  const p = path.split(".");
  if (p[0] === "in") return p.slice(2).reduce((o, k) => o?.[k], SCENARIOS[p[1]]);
  if (p[0] === "shared") return SHARED[p[1]];
  const r = model.scenarios[p[0]];
  if (!r) throw new Error(`Unknown model path: ${path}`);
  const v = p.slice(1).reduce((o, k) => o?.[k], r);
  if (v === undefined) throw new Error(`Unknown model path: ${path}`);
  return v;
}
const fill = (s) => s.replace(/\{\{\s*([\w.]+)\s*(?:\|\s*(\w+))?\s*\}\}/g, (_, path, f) => (FMT[f || "raw"])(resolvePath(path)));

// ---------- parse ----------
const sections = md.split(/^## /m).slice(1);
const registry = {};
const slides = [];
for (const sec of sections) {
  const [head, ...lines] = sec.split("\n");
  if (head.trim() === "pending-registry") {
    for (const l of lines) if (l.startsWith("- ")) { const [id, file, desc, ratio] = l.slice(2).split(" | ").map((x) => x.trim()); registry[id] = { id, file, desc, ratio }; }
    continue;
  }
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

// ---------- html helpers ----------
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const one = (d, k) => (d[k] && d[k][0]) || "";
const cells = (s) => s.split(" | ").map((x) => x.trim());
const STATUS = { "Built": ["●", "built"], "In build": ["◆", "inbuild"], "Planned": ["○", "planned"], "Hypothesis": ["▲", "hyp"], "Preview": ["■", "preview"] };
const REC = { Implement: ["●", "built"], Validate: ["◆", "inbuild"], Defer: ["○", "planned"] };
function chips(str, table = STATUS) {
  return str.split("+").map((s) => s.trim()).filter(Boolean).map((s) => {
    const t = table[s]; if (!t) throw new Error(`Unknown status word "${s}"`);
    return `<span class="chip ${t[1]}"><i aria-hidden="true">${t[0]}</i>${esc(s)}</span>`;
  }).join("");
}
function fileExists(rel) { return existsSync(join(here, rel)); }
function img(name, cls = "") { return `<img class="${cls}" src="assets/img/${esc(name)}" alt="" />`; }
function shot(name) { return `<figure class="phone"><img src="assets/shots/${esc(name)}" alt="" /></figure>`; }
function pending(id, extra = "") {
  const r = registry[id]; if (!r) throw new Error(`Pending id ${id} not in registry`);
  const found = ["assets/img/", "assets/pending/"].map((p) => p + r.file).find(fileExists);
  const cls = `slot r-${r.ratio.replace(":", "-")} ${extra}`;
  if (found) return `<figure class="${cls} filled"><img src="${found}" alt="" /></figure>`;
  return `<figure class="${cls} pending" data-asset="${id}"><b>IMAGE PENDING ${id}</b><span>${esc(r.desc)}</span><span class="mono">${esc(r.ratio)} · assets/pending/${esc(r.file)}</span></figure>`;
}
function pendings(d, extra) { return (d.pending || []).map((id) => pending(id, extra)).join(""); }
const pad = (n) => String(n).padStart(2, "0");

// ---------- layouts ----------
const L = {};
L.cover = (d) => `
  <div class="cv-text"><h1 class="display cv-h">${esc(one(d, "headline"))}</h1>
  <p class="cv-sub">${esc(one(d, "sub"))}</p><p class="lede">${esc((d.body || [])[0])}</p><p class="cv-cap mono">${esc(one(d, "caption"))}</p></div>
  ${img(one(d, "img"), "cv-img")}`;

L.vision = (d) => `
  <div class="vs-top"><div class="vs-l"><h2 class="display h-disp">${esc(one(d, "headline"))}</h2><p class="sub">${esc(one(d, "sub"))}</p></div>
  <ul class="rows vs-r">${d.items.map((i) => { const [n, s, t] = cells(i); return `<li><span class="rn">${esc(n)}</span><span class="rc">${chips(s)}</span><span class="rt">${esc(t)}</span></li>`; }).join("")}</ul></div>
  ${img(one(d, "img"), "vs-img")}`;

L.problem = (d) => `
  <div class="two prob"><div class="col-l"><h2 class="h">${esc(one(d, "headline"))}</h2><p class="sub">${esc(one(d, "sub"))}</p>${img(one(d, "img"), "sq")}</div>
  <ol class="numlist">${d.items.map((i, k) => { const [t, x] = cells(i); return `<li><span class="mono num">${pad(k + 1)}</span><div><h3>${esc(t)}</h3><p>${esc(x)}</p></div></li>`; }).join("")}</ol></div>`;

L.audience = (d) => `
  <h2 class="h wide">${esc(one(d, "headline"))}</h2><p class="sub">${esc(one(d, "sub"))}</p>
  <div class="cols4">${d.items.map((i) => { const [t, x] = cells(i); return `<div class="colbox"><h3>${esc(t)}</h3><p>${esc(x)}</p></div>`; }).join("")}${img(one(d, "img"), "sq")}</div>`;

L.opportunity = (d) => {
  const groups = {}; for (const i of d.items) { const [g, s, t] = cells(i); (groups[g] ??= []).push([s, t]); }
  return `<div class="two"><div class="col-w"><h2 class="h">${esc(one(d, "headline"))}</h2><p class="sub">${esc(one(d, "sub"))}</p>
  <div class="grps">${Object.entries(groups).map(([g, its]) => `<div class="grp"><h3 class="mono gh">${esc(g)}</h3><ul class="rows stack">${its.map(([s, t]) => `<li><span class="rc">${chips(s)}</span><span class="rt">${esc(t)}</span></li>`).join("")}</ul></div>`).join("")}</div></div>
  ${img(one(d, "img"), "sq side")}</div>`;
};

L.solution = (d) => `
  <h2 class="h wide">${esc(one(d, "headline"))}</h2><p class="sub">${esc(one(d, "sub"))}</p>
  <div class="cols4 pillars">${d.items.map((i) => { const [t, s, x, f] = cells(i); return `<div class="pillar">${img(f, "pimg")}<h3>${esc(t)}</h3><div>${chips(s)}</div><p>${esc(x)}</p></div>`; }).join("")}</div>`;

L.product = (d) => `
  <h2 class="h wide">${esc(one(d, "headline"))} <span class="sub inline">${esc(one(d, "sub"))}</span></h2>
  <div class="phones">${d.items.map((i) => { const [f, c] = cells(i); return `<div class="pcol">${shot(f)}<p class="pcap">${esc(c)}</p></div>`; }).join("")}
  ${(d.pending || []).map((id) => `<div class="pcol">${pending(id, "phone-slot")}<p class="pcap">${esc(registry[id].desc)}</p></div>`).join("")}</div>`;

function flywheel(items) {
  const cx = 300, cy = 300, R = 215, n = items.length;
  const pt = (k, r = R) => { const a = (-90 + (360 / n) * k) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  let g = "";
  for (let k = 0; k < n; k++) {
    const a1 = (-90 + (360 / n) * k + 20) * Math.PI / 180, a2 = (-90 + (360 / n) * (k + 1) - 20) * Math.PI / 180;
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1), x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
    g += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" class="arc" marker-end="url(#ah)"/>`;
  }
  for (let k = 0; k < n; k++) {
    const [x, y] = pt(k); const [t] = cells(items[k]).slice(1);
    const ca = Math.cos((-90 + (360 / n) * k) * Math.PI / 180), sa = Math.sin((-90 + (360 / n) * k) * Math.PI / 180);
    const anchor = ca > 0.3 ? "start" : ca < -0.3 ? "end" : "middle";
    const lab = [x + (anchor === "start" ? 58 : anchor === "end" ? -58 : 0), y + (anchor === "middle" ? (sa < 0 ? -58 : 70) : 9)];
    g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="42" class="node"/><text x="${x.toFixed(1)}" y="${(y + 9).toFixed(1)}" class="nn">${k + 1}</text>`;
    g += `<text x="${lab[0].toFixed(1)}" y="${lab[1].toFixed(1)}" class="nl" text-anchor="${anchor}">${esc(t)}</text>`;
  }
  return `<svg viewBox="-80 -50 760 700" class="fly" role="img" aria-label="Contribution flywheel: ride, contribute, moderate, trust, more riders"><defs><marker id="ah" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="ahd"/></marker></defs>${g}<text x="${cx}" y="${cy - 4}" class="ct" text-anchor="middle">Trusted</text><text x="${cx}" y="${cy + 32}" class="ct" text-anchor="middle">directory</text></svg>`;
}
L.flywheel = (d) => `
  <div class="fw"><div class="fw-svg"><h2 class="h">${esc(one(d, "headline"))}</h2><p class="sub">${esc(one(d, "sub"))}</p>${flywheel(d.items)}</div>
  <ol class="steps">${d.items.map((i) => { const [n, t, x, s] = cells(i); return `<li><span class="mono num">${esc(n)}</span><div><h3>${esc(t)} ${chips(s)}</h3><p>${esc(x)}</p></div></li>`; }).join("")}</ol>
  <div class="fw-r">${pendings(d)}${(d.stats || []).map((s) => { const [v, l, st] = cells(s); return `<div class="stat"><b class="big">${esc(v)}</b><span>${esc(l)}</span>${chips(st)}</div>`; }).join("")}</div></div>`;

L.engagement = (d) => `
  <div class="two eng"><div class="col-w"><h2 class="h">${esc(one(d, "headline"))}</h2><p class="sub">${esc(one(d, "sub"))}</p>
  <ul class="defs">${d.items.map((i) => { const [t, x] = cells(i); return `<li><h3>${esc(t)}</h3><p>${esc(x)}</p></li>`; }).join("")}</ul></div>
  <div class="eng-r">${pending("IMG-E02")}${pending("SHOT-02", "phone-slot small")}</div></div>`;

L.shop = (d) => `
  <div class="two shop"><div class="col-w"><h2 class="h">${esc(one(d, "headline"))}</h2><p class="sub">${esc(one(d, "sub"))}</p>
  <ul class="defs tight">${d.items.map((i) => { const [t, x] = cells(i); return `<li><h3>${esc(t)}</h3><p>${esc(x)}</p></li>`; }).join("")}</ul>
</div>
  <div class="shop-r">${pending("IMG-E03")}${pending("SHOT-01", "phone-slot small")}<div class="statrow">${(d.stats || []).map((s) => { const [v, l, st] = cells(s); return `<div class="stat"><b class="big">${esc(v)}</b><span>${esc(l)}</span>${chips(st)}</div>`; }).join("")}</div></div></div>`;

function ladder() {
  let dots = ""; for (let k = 0; k < 50; k++) { const c = k < 5 ? "d0" : k < 20 ? "d1" : "d2"; dots += `<i class="dot ${c}"></i>`; }
  return `<div class="ladder" role="img" aria-label="Capacity: 5 free, up to 20 with Large Ride Pass, up to 50 with Myto Organiser">${dots}</div>`;
}
L.group = (d) => `
  <div class="gr"><div class="gr-a"><h2 class="h">${esc(one(d, "headline"))}</h2><p class="sub">${esc(one(d, "sub"))}</p>${ladder()}
  <ul class="tiers">${d.items.map((i, k) => { const [t, cap, p, s] = cells(i); return `<li><i class="dot d${k}"></i><b class="tn">${esc(t)}</b><span class="mono cap">max ${esc(cap)}</span><span class="tp">${esc(p)}</span>${chips(s)}</li>`; }).join("")}</ul></div>
  <div class="gr-b">${(d.stats || []).map((s) => { const [v, l, st] = cells(s); return `<div class="stat"><b class="big sm">${esc(v)}</b><span>${esc(l)}</span>${chips(st)}</div>`; }).join("")}${pending("IMG-O02")}</div>
  <div class="gr-c">${shot(one(d, "shot"))}</div></div>`;

L.monetisation = (d) => {
  const arch = [["Participants", "never pay, in any group ride"], ["Free for everyone", "Explore, Ride, Fix-it, clubs, rides to 5"], ["Organiser pays", "Large Ride Pass, Myto Organiser"], ["Shop, outside the app", "Originals and curated, physical goods"], ["Partner pays", "labelled sponsored challenges"]];
  return `<div class="mo"><div class="mo-a"><h2 class="h">${esc(one(d, "headline"))}</h2><p class="sub">${esc(one(d, "sub"))}</p>
  <table class="tbl"><thead><tr><th>Stream</th><th>Who pays</th><th>Score</th><th>Call</th></tr></thead><tbody>${d.items.map((i) => { const [t, w, r, sc] = cells(i); return `<tr><td class="tn">${esc(t)}</td><td>${esc(w)}</td><td><span class="bar"><i style="width:${(Number(sc) / 35 * 100).toFixed(0)}%"></i></span><span class="mono">${esc(sc)}</span></td><td>${chips(r, REC)}</td></tr>`; }).join("")}</tbody></table></div>
  <div class="mo-b"><h3 class="mono gh">Architecture</h3>${arch.map(([a, b], k) => `<div class="layer l${k}"><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join("")}</div></div>`;
};

L.partnerships = (d) => `
  <div class="pt"><div><h2 class="h">${esc(one(d, "headline"))}</h2><p class="sub">${esc(one(d, "sub"))}</p>
  <ol class="numlist two-col">${d.items.map((i, k) => { const [t, x] = cells(i); return `<li><span class="mono num">${pad(k + 1)}</span><div><h3>${esc(t)}</h3><p>${esc(x)}</p></div></li>`; }).join("")}</ol></div>
  <div class="pt-r">${pendings(d)}</div></div>`;

L.gtm = (d) => `
  <div class="gt"><div class="gt-a"><h2 class="h">${esc(one(d, "headline"))}</h2><p class="sub">${esc(one(d, "sub"))}</p>
  <ul class="defs tight">${d.items.map((i) => { const [t, x] = cells(i); return `<li><h3>${esc(t)}</h3><p>${esc(x)}</p></li>`; }).join("")}</ul></div>
  <div class="gt-b"><h3 class="mono gh">Approved trails in the repo (not samples)</h3><table class="tbl small"><tbody>${d.trails.map((t) => { const [n, dist, km] = cells(t); return `<tr><td class="tn">${esc(n)}</td><td>${esc(dist)}</td><td class="mono">${esc(km)}</td></tr>`; }).join("")}</tbody></table>
  <p class="note">All four are in Karnataka, in or beside Bengaluru. Six further trails in the seed data are flagged sample and are not coverage.</p></div>
  <div class="gt-c">${img(one(d, "img"), "sq")}</div></div>`;

function timeline() {
  const seg = [[0, 3, "Foundation"], [3, 6, "First monetisation"], [6, 9, "Engagement"], [9, 12, "Consolidation"]];
  return `<div class="tl">${MONTHS.map((m) => `<span class="mono tm">${m}</span>`).join("")}${seg.map(([a, b, n], k) => `<div class="tseg s${k}" style="grid-column:${a + 1}/${b + 1}">${esc(n)}</div>`).join("")}</div>`;
}
L.roadmap = (d) => `
  <h2 class="h wide">${esc(one(d, "headline"))} <span class="sub inline">${esc(one(d, "sub"))}</span></h2>${timeline()}
  <div class="phs">${d.phases.map((p, k) => { const [n, dt, th, gate] = cells(p); return `<div class="ph"><h3>${esc(n)}</h3><p class="mono dt">${esc(dt)}</p><p class="th">${esc(th)}</p>
  <ul>${d.items.filter((i) => cells(i)[0] === String(k + 1)).map((i) => { const [, t, pr, s] = cells(i); return `<li><span>${esc(t)}</span><span class="pr mono">${esc(pr)}</span>${chips(s)}</li>`; }).join("")}</ul><p class="gate">${esc(gate)}</p></div>`; }).join("")}</div>`;

// ---- charts (native SVG from the model) ----
const COL = { conservative: "#8a8178", base: "#1f4a6b", ambitious: "#b0442e" };
function barChart() {
  const ks = ["conservative", "base", "ambitious"]; const W = 860, H = 270, top = 34, base0 = 150, bot = 236;
  const vals = ks.flatMap((k) => [model.scenarios[k].year.revenue, model.scenarios[k].year.opex, Math.abs(model.scenarios[k].year.net)]);
  const mx = Math.max(...vals); const up = (base0 - top) / mx, dn = (bot - base0) / mx;
  let s = `<line x1="40" x2="${W}" y1="${base0}" y2="${base0}" class="axis"/>`;
  ks.forEach((k, gi) => {
    const y = model.scenarios[k].year; const gx = 60 + gi * 270;
    const bars = [["Revenue", y.revenue, "#1f4a6b", up], ["Opex", y.opex, "#6b6560", up], ["Net", y.net, "#a32d1c", y.net < 0 ? dn : up]];
    bars.forEach(([nm, v, c, sc], bi) => {
      const x = gx + bi * 76, h = Math.max(Math.abs(v) * sc, 2);
      const yy = v >= 0 ? base0 - h : base0; const ly = v >= 0 ? yy - 8 : yy + h + 22;
      s += `<rect x="${x}" y="${yy.toFixed(1)}" width="62" height="${h.toFixed(1)}" fill="${c}" ${nm === "Opex" ? 'opacity=".55"' : ""}/><text x="${x + 31}" y="${ly.toFixed(1)}" class="bv" text-anchor="middle">${esc(inrShort(v))}</text>`;
    });
    s += `<text x="${gx + 107}" y="${H - 4}" class="bl" text-anchor="middle">${model.scenarios[k].label}</text>`;
  });
  return `<p class="legend"><i style="background:#1f4a6b"></i>Revenue <i style="background:#6b6560;opacity:.55"></i>Opex <i style="background:#a32d1c"></i>Net</p><svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Year-one revenue, opex and net by scenario">${s}</svg>`;
}
function lineChart() {
  const ks = ["conservative", "base", "ambitious"]; const W = 860, H = 240, l = 86, r = 150, t = 14, b = 34;
  const cum = ks.map((k) => { let a = 0; return model.scenarios[k].rows.map((x) => (a += x.net)); });
  const mn = Math.min(...cum.flat(), 0), mxv = Math.max(...cum.flat(), 0);
  const X = (i) => l + (i / 11) * (W - l - r), Y = (v) => t + ((mxv - v) / (mxv - mn)) * (H - t - b);
  let s = ""; const step = 100000;
  for (let v = Math.ceil(mn / step) * step; v <= mxv; v += step) s += `<line x1="${l}" x2="${W - r}" y1="${Y(v)}" y2="${Y(v)}" class="${v === 0 ? "axis" : "grid"}"/><text x="${l - 8}" y="${Y(v) + 6}" text-anchor="end" class="bv">${esc(inrShort(v))}</text>`;
  MONTHS.forEach((m, i) => { if (i % 3 === 0) s += `<text x="${X(i)}" y="${H - 12}" class="bv" text-anchor="middle">${m}</text>`; });
  const ends = ks.map((k, ki) => ({ k, ki, y: Y(cum[ki][11]) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y < ends[i - 1].y + 40) ends[i].y = ends[i - 1].y + 40;
  ks.forEach((k, ki) => {
    s += `<polyline fill="none" stroke="${COL[k]}" stroke-width="4" points="${cum[ki].map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}"/>`;
    const ly = ends.find((e) => e.ki === ki).y;
    s += `<text x="${X(11) + 12}" y="${(ly - 4).toFixed(1)}" class="bv" fill="${COL[k]}">${model.scenarios[k].label}</text><text x="${X(11) + 12}" y="${(ly + 15).toFixed(1)}" class="bv" fill="${COL[k]}">${esc(inrShort(cum[ki][11]))}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Cumulative net by month, three scenarios, all below zero">${s}</svg>`;
}
L.financials = (d) => `
  <div class="fi"><div class="fi-a"><h2 class="h">${esc(one(d, "headline"))}</h2><p class="sub">${esc(one(d, "sub"))}</p>
  <h3 class="mono gh">Year one: revenue, opex, net</h3>${barChart()}<h3 class="mono gh">Cumulative net by month</h3>${lineChart()}</div>
  <div class="fi-b"><table class="tbl stats"><thead><tr><th></th><th>Conservative</th><th>Base</th><th>Ambitious</th></tr></thead><tbody>
  ${d.stats.map((s) => { const [v, l, st] = cells(s); const vs = v.split(" / "); return `<tr><td class="lbl">${esc(l)}</td>${vs.map((x) => `<td class="mono v">${esc(x)}</td>`).join("")}</tr>`; }).join("")}</tbody></table></div></div>`;

L.competitive = (d) => `
  <h2 class="h wide">${esc(one(d, "headline"))}</h2><p class="sub">${esc(one(d, "sub"))}</p>
  <table class="tbl comp"><thead><tr><th>Capability</th><th>Myto today</th><th>Riding Verse, per the note</th><th>Evidence grade</th></tr></thead><tbody>
  ${d.items.map((i) => { const [c, s, o, e] = cells(i); return `<tr><td class="tn">${esc(c)}</td><td>${chips(s)}</td><td>${esc(o)}</td><td class="ev">${esc(e)}</td></tr>`; }).join("")}</tbody></table>`;

L["vision-long"] = (d) => `
  <div class="vl"><div class="vl-t"><h2 class="display h-disp">${esc(one(d, "headline"))}</h2><p class="sub">${esc(one(d, "sub"))}</p>
  <ul class="rows">${d.items.map((i) => { const [t, x] = cells(i); return `<li><span class="rn">${esc(t)}</span><span class="rt">${esc(x)}</span></li>`; }).join("")}</ul></div>${img(one(d, "img"), "vl-img")}</div>`;

// ---------- assemble ----------
const total = slides.length;
const sec = slides.map((d) => {
  if (!L[d.layout]) throw new Error(`No layout "${d.layout}" (slide ${d.n})`);
  const status = one(d, "status");
  const meta = [one(d, "assumptions") && `Assumptions: ${one(d, "assumptions")}`, one(d, "sources") && `Sources: ${one(d, "sources")}`].filter(Boolean).join("  ");
  return `<div class="cell" data-n="${d.n}"><section class="slide l-${d.layout}" id="s${d.n}" aria-label="Slide ${d.n} of ${total}">
<header class="s-head"><span class="mono kicker">${esc(one(d, "kicker"))}</span><span class="chips">${chips(status)}</span></header>
<div class="s-body">${L[d.layout](d)}</div>
<footer class="s-foot"><p class="cap">${esc(one(d, "caption"))}</p><p class="meta mono">${esc(meta)}</p><span class="pg mono">${pad(d.n)} / ${pad(total)}</span></footer>
</section></div>`;
}).join("\n");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Myto strategy deck (preview draft)</title>
<link rel="stylesheet" href="styles.css">
</head><body>
<!-- GENERATED by build.mjs from deck-content.md and ../model.mjs. Do not edit by hand. -->
<main id="deck" aria-live="polite">
${sec}
</main>
<nav id="ui" aria-label="Slide controls"><button id="prev" aria-label="Previous slide">‹</button><span id="count" class="mono">1 / ${total}</span><button id="next" aria-label="Next slide">›</button><button id="ov" aria-label="Overview grid (G)">Overview</button><button id="pm" aria-label="Presentation mode (P)">Present</button></nav>
<script src="presentation.js"></script>
</body></html>
`;
writeFileSync(join(here, "index.html"), html);
console.log(`index.html written: ${total} slides; pending images: ${(html.match(/IMAGE PENDING/g) || []).length} placeholders`);
