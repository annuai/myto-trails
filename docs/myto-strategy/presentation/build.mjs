#!/usr/bin/env node
// Generates index.html from deck-content.md + ../model.mjs. Dependency-free.
// Usage: node build.mjs   (or `npm run deck:build` from the repo root)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { MONTHS, inrShort } from "../model.mjs";
import { ARCH, TRAILS_NOTE, DECK } from "./deck-data.mjs";

const here = dirname(fileURLToPath(import.meta.url));
try { execFileSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), "prepare-assets.mjs")], { stdio: "inherit" }); } catch {}
import { slides, model, cells, one } from "./deck-data.mjs";

// ---------- helpers ----------
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const LOGO = readFileSync(join(here, "assets/img/myto-logo.svg"), "utf8").replace(/fill="white"/g, 'fill="currentColor"').replace(/<svg /, '<svg class="logo" role="img" aria-label="Myto" ');
const pad = (n) => String(n).padStart(2, "0");

// glyphs: the app's Check / Alert / X / Help set, drawn on a 16 unit grid (see apps/mobile/src/ui/Chip.tsx StatusChip)
const G = {
  check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.5"/></svg>',
  half: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.6"/><path class="fillg" d="M8 2.4a5.6 5.6 0 0 1 0 11.2z"/></svg>',
  dash: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.6" stroke-dasharray="2.2 2.4"/></svg>',
  help: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.8"/><path d="M6.3 6.4a1.8 1.8 0 1 1 2.6 1.6c-.6.4-.9.8-.9 1.4M8 11.5v.1"/></svg>',
};
const STATUS = { "Built": [G.check, "good"], "In build": [G.half, "accent"], "Planned": [G.dash, "unknown"], "Hypothesis": [G.help, "caution"] };
const REC = { Implement: [G.check, "good"], Validate: [G.half, "accent"], Defer: [G.dash, "unknown"] };
function badges(str, table = STATUS) {
  return `<span class="bgs">` + str.split("+").map((s) => s.trim()).filter(Boolean).map((s) => {
    const t = table[s]; if (!t) throw new Error(`Unknown status word "${s}"`);
    return `<span class="badge ${t[1]}">${t[0]}${esc(s)}</span>`;
  }).join("") + `</span>`;
}
const badge1 = (s, table) => badges(s, table);

function asset(stem) {
  for (const ext of ["jpg", "webp"]) if (existsSync(join(here, "assets/opt", `${stem}.${ext}`))) return `assets/opt/${stem}.${ext}`;
  for (const dir of ["img", "pending"]) { const f = join(here, "assets", dir, stem + ".webp"); if (existsSync(f)) return `assets/${dir}/${stem}.webp`; }
  throw new Error(`Image not found: ${stem}`);
}
const stem = (f) => f.replace(/\.(webp|jpg|png)$/, "");
const picture = (name) => asset(stem(name));
const frame = (name, cls = "", pos = "") => `<figure class="frame ${cls}"><img src="${picture(name)}" alt=""${pos ? ` style="object-position:${pos}"` : ""}></figure>`;
function shotFile(name) { if (!existsSync(join(here, "assets/shots", name))) throw new Error(`Shot not found: ${name}`); return `assets/shots/${name}`; }
const hd = (d, cls = "", h = "t-hero") => `<div class="hd ${cls}"><h2 class="${h}">${esc(one(d, "headline"))}</h2><p class="lede">${esc(one(d, "sub"))}</p></div>`;
const stat = (s, cls = "") => { const [v, l] = cells(s); return `<div class="stat ${cls}"><b>${esc(v)}</b><span>${esc(l)}</span></div>`; };

// concept mockup pieces (Shop and Marks): the app's components at the app's own scale
const ICON = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  pkg: '<svg viewBox="0 0 24 24"><path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2z"/><path d="M4 7.2l8 4.3 8-4.3M12 11.5V21"/></svg>',
  ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  tick: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
};
function stamp(kind, earned) {
  if (!earned) return `<svg class="stamp" viewBox="0 0 56 56" aria-hidden="true"><circle class="off" cx="28" cy="28" r="26"/></svg>`;
  const g = { route: '<path class="g" d="M17 37 C 21 25, 29 39, 34 27 S 38 21, 40 20"/><circle class="gf" cx="17" cy="37" r="3"/>',
    riders: '<circle class="gf" cx="28" cy="21" r="3.6"/><circle class="gf" cx="20.5" cy="34" r="3.6"/><circle class="gf" cx="35.5" cy="34" r="3.6"/>',
    nut: '<polygon class="g" points="28,16 38.4,22 38.4,34 28,40 17.6,34 17.6,22"/><circle class="g" cx="28" cy="28" r="4"/>',
    dial: '<circle class="g" cx="28" cy="28" r="11"/><path class="g" d="M28 28 L28 20 M28 28 L34 31"/>' }[kind];
  return `<svg class="stamp" viewBox="0 0 56 56" aria-hidden="true"><circle class="disc" cx="28" cy="28" r="26"/><circle class="ring" cx="28" cy="28" r="21"/>${g}</svg>`;
}
const progress = (v, m) => `<div class="progress"><i style="width:${Math.round((v / m) * 100)}%"></i></div>`;
const tag = () => `<span class="badge plain tag">${G.help.replace("</svg>", "")}</svg>Concept, not a screenshot</span>`;
const tagPill = `<span class="badge plain tag"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.8" y="2.8" width="10.4" height="10.4" rx="3" stroke-dasharray="2.4 2.2"/></svg>Concept, not a screenshot</span>`;

function shopPhone() {
  const prods = [["Trail Beam", "Light that cuts through every condition."], ["Trail Kit", "Everything you need. Organised where you need it."], ["Navi", "Navigate. Nothing else."]];
  const card = ([n, t]) => `<div class="card"><div class="mk"><div class="prodimg sq">${ICON.pkg}</div><div class="grow"><div class="t-body-m">${n}</div><div class="t-label muted">${t}</div></div></div><div style="margin-top:var(--space-3)"><span class="badge">Pre-order on the website</span></div></div>`;
  return `<div class="phone-wrap">${tagPill}<div class="phone concept"><div class="scr app">
    <div class="back">${ICON.back}Home</div>
    <div class="page-title"><div class="t-title">Shop</div><div class="sub">Gear we picked for the road. You buy it on myto-moto.com, not in the app.</div></div>
    <div class="sec-title first">Featured</div>
    <div class="gap3">${prods.map(card).join("")}</div>
    <div class="card gap3" style="margin-top:var(--space-4)"><div class="btn soft center">${ICON.ext}Visit myto-moto.com</div><div class="t-caption muted">Opens the website in your browser. You leave Myto Moto to buy.</div></div>
  </div></div></div>`;
}
function marksPhone() {
  const badgeCard = (kind, t, hint, v, m) => `<div class="card"><div class="mk">${stamp(kind, false)}<div class="grow"><div class="t-body-m muted">${t}</div><div class="t-label muted">${hint}</div>${progress(v, m)}<div class="t-label muted">${v} of ${m}</div></div></div></div>`;
  return `<div class="phone-wrap">${tagPill}<div class="phone concept"><div class="scr app">
    <div class="back">${ICON.back}You</div>
    <div class="page-title"><div class="t-title">Marks</div><div class="sub">First times, badges and thank-yous. Nothing here is about speed.</div></div>
    <div class="cat first">Exploration</div>
    <div class="gap3">${badgeCard("route", "Weekend Wanderer", "Ride on 5 different weekends.", 2, 5)}</div>
    <div class="sec-title">Trailmarks</div>
    <div class="card gap3"><div class="tm-total">12</div><div class="t-label muted">A thank-you for helping the map, not money or crypto. They can't be bought, sold or cashed out.</div></div>
    <div class="sec-title">Challenges</div>
    <div class="card gap3"><div class="t-body-m">Visit 5 scenic viewpoints</div><div class="t-label muted">Optional. Nothing counts until you join.</div><div class="btn soft center">Join challenge</div></div>
  </div></div></div>`;
}
function realPhone(file, cls = "") { return `<div class="phone ${cls}"><div class="scr"><img src="${shotFile(file)}" alt=""></div></div>`; }

// ---------- layouts ----------
const L = {};
L.cover = (d) => `
  <div class="cv-row"><h1 class="sr-only">${esc(one(d, "headline"))}</h1>
  <div class="cv-copy"><p class="t-display cv-line">${esc(one(d, "sub"))}</p><p class="t-body muted">${esc((d.body || [])[0])}</p></div></div>
  <!--ART--><div class="cv-art"><img src="${picture(one(d, "img"))}" alt=""></div>
  <p class="cv-fine">${esc(one(d, "caption"))}</p><!--/ART-->`;

L.vision = (d) => `<div class="vs"><div class="vs-l">${hd(d)}${frame(one(d, "img"), "", "42% 50%")}</div>
  <div class="vs-g">${d.items.map((it, k) => { const [n, st, t] = cells(it); const tint = ["sky", "clay", "sand", "sage"][k]; return `<div class="pillar tint-${tint}"><h3>${esc(n)}</h3><p>${esc(t)}</p>${badges(st)}</div>`; }).join("")}</div></div>`;

L.problem = (d) => `${hd(d, "wide")}
  <div class="pb">${frame(one(d, "img"), "", "50% 60%")}<ul class="list">${d.items.map((it, k) => { const [t, x] = cells(it); return `<li><span class="num">${k + 1}</span><div class="grow"><h3>${esc(t)}</h3><p>${esc(x)}</p></div></li>`; }).join("")}</ul></div>`;

L.audience = (d) => `${hd(d, "wide")}
  <div class="au">${frame(one(d, "img"), "", "50% 70%")}${d.items.map((it, k) => { const [t, pay, x] = cells(it); const [lab, val] = pay.split(": "); const tint = ["sage", "sky", "sand"][k]; return `<div class="role tint-${tint}"><h3>${esc(t)}</h3><p>${esc(x)}</p><div class="pays"><small>${esc(lab)}</small><b>${esc(val)}</b></div></div>`; }).join("")}</div>`;

L.opportunity = (d) => {
  const groups = {}; for (const it of d.items) { const [g, s, t] = cells(it); (groups[g] ??= { s, items: [] }).items.push(t); }
  const tints = ["sage", "sky"];
  return `<!--ART--><div class="art-left-img"><img src="${picture(one(d, "img"))}" alt=""></div><!--/ART-->${hd(d, "wide")}
  <div class="op">${Object.entries(groups).map(([g, v], k) => `<div class="grp tint-${tints[k]}"><header><h3>${esc(g)}</h3>${badges(v.s)}</header><ul>${v.items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>`).join("")}</div>`;
};

L.solution = (d) => `${hd(d, "wide")}
  <div class="so">${d.items.map((it, k) => { const [t, s, x, f] = cells(it); const tint = ["sky", "clay", "sand", "sage"][k]; const cut = f.startsWith("adventure"); return `<div class="part tint-${tint}">${frame(f, "thumb" + (cut ? " cutout" : ""), cut ? "" : "50% 70%")}<h3>${esc(t)}</h3><p>${esc(x)}</p>${badges(s)}</div>`; }).join("")}</div>`;

L.product = (d) => `<div class="hd"><h2 class="t-hero">${esc(one(d, "headline"))}</h2></div>
  <div class="pr">${d.items.map((it) => { const [f, c] = cells(it); const [a, b] = c.split(": "); return `<figure><figcaption><b>${esc(a)}</b><span>${esc(b[0].toUpperCase() + b.slice(1))}</span></figcaption>${realPhone(f, "crop")}</figure>`; }).join("")}</div>`;

function flywheel(items) {
  const cx = 380, cy = 232, R = 150, r = 40, n = items.length;
  const pol = (deg, rad = R) => [cx + rad * Math.cos(deg * Math.PI / 180), cy + rad * Math.sin(deg * Math.PI / 180)];
  const half = Math.asin((r + 12) / R) * 180 / Math.PI;
  const fills = ["var(--tint-sky)", "var(--tint-sage)", "var(--tint-sand)", "var(--tint-clay)", "var(--accent-subtle)"];
  let g = `<defs><marker id="ah" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto"><path d="M1 1l6 3.5-6 3.5" fill="none" stroke="#1f4a6b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`;
  for (let k = 0; k < n; k++) {
    const a1 = -90 + (360 / n) * k + half, a2 = -90 + (360 / n) * (k + 1) - half;
    const [x1, y1] = pol(a1), [x2, y2] = pol(a2);
    g += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="#1f4a6b" stroke-width="3.5" stroke-linecap="round" marker-end="url(#ah)"/>`;
  }
  for (let k = 0; k < n; k++) {
    const deg = -90 + (360 / n) * k; const [x, y] = pol(deg); const t = cells(items[k])[1];
    const ca = Math.cos(deg * Math.PI / 180);
    const anchor = ca > 0.3 ? "start" : ca < -0.3 ? "end" : "middle";
    const lx = anchor === "start" ? x + r + 14 : anchor === "end" ? x - r - 14 : x;
    const ly = anchor === "middle" ? y - r - 18 : y + 11;
    g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${fills[k]}"/><text x="${x.toFixed(1)}" y="${(y + 11).toFixed(1)}" text-anchor="middle" font-family="Michroma" font-size="28" fill="#1a1a1a">${k + 1}</text>`;
    g += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" font-family="Geist" font-weight="600" font-size="32" fill="#1a1a1a">${esc(t)}</text>`;
  }
  g += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" font-family="Michroma" font-size="21" fill="#1a1a1a">Trusted</text><text x="${cx}" y="${cy + 26}" text-anchor="middle" font-family="Michroma" font-size="21" fill="#1a1a1a">directory</text>`;
  return `<svg viewBox="0 0 760 440" role="img" aria-label="Contribution flywheel: ride, contribute, moderate, trust, more riders">${g}</svg>`;
}
L.flywheel = (d) => {
  const fills = ["sky", "sage", "sand", "clay", "accent"];
  return `<div class="fw"><div class="fw-l">${hd(d)}<div class="fw-wheel">${flywheel(d.items)}</div>
  <div class="fw-stats">${d.stats.map((s, k) => `<div class="tint-${["sage", "sky"][k]}">${stat(s)}</div>`).join("")}</div></div>
  <div class="fw-r">${frame(one(d, "img"), "", "50% 78%")}<ul class="list">${d.items.map((it, k) => { const [n, t, x, s] = cells(it); return `<li><span class="nn" style="background:var(--${fills[k] === "accent" ? "accent-subtle" : "tint-" + fills[k]})">${n}</span><div class="grow"><h3>${esc(t)}</h3><p>${esc(x)}</p></div>${badges(s)}</li>`; }).join("")}</ul></div></div>`;
};

L.engagement = (d) => {
  const [nt, nx] = cells(one(d, "note"));
  return `<div class="cc"><div class="cc-a">${hd(d)}<ul class="dl">${d.items.map((it) => { const [t, x] = cells(it); return `<li><h3>${esc(t)}</h3><p>${esc(x)}</p></li>`; }).join("")}</ul></div>
  <div class="cc-b">${frame(one(d, "img"), "", "76% 60%").replace('class="frame ', 'class="frame hh ')}<div class="tint-sage cc-note"><div class="t-title">${esc(nt)}</div><p>${esc(nx)}</p></div></div>
  ${marksPhone()}</div>`;
};

L.shop = (d) => `<div class="cc"><div class="cc-a">${hd(d)}<ul class="dl">${d.items.map((it) => { const [t, x] = cells(it); return `<li><h3>${esc(t)}</h3><p>${esc(x)}</p></li>`; }).join("")}</ul></div>
  <div class="cc-b">${frame(one(d, "img"), "hh", "30% 50%")}${d.stats.map((s, k) => { const [v, l, st] = cells(s); return `<div class="${["tint-sand", "tint-sky"][k]} cc-stat"><div class="row"><b class="t-data-l">${esc(v)}</b>${badges(st)}</div><p>${esc(l)}</p></div>`; }).join("")}</div>
  ${shopPhone()}</div>`;

L.group = (d) => `<div class="gr"><div class="gr-a"><div class="hd wide"><h2 class="t-hero">${esc(one(d, "headline"))}</h2></div>
  <div class="tiers">${d.items.map((it, k) => { const [t, cap, p, st] = cells(it); return `<div class="tier tint-${["sage", "sky", "sand"][k]}"><div class="cap-n">${esc(cap)}</div><h3>${esc(t)}</h3><p>${esc(p)}</p>${badges(st)}</div>`; }).join("")}</div>
  <div class="gr-bot">${frame(one(d, "img"), "", "50% 62%")}<ul class="list">${d.stats.map((s) => { const [v, l, st] = cells(s); const w = st.split("+")[0]; return `<li><span class="g ${STATUS[w][1]}" title="${esc(w)}">${STATUS[w][0]}</span><div class="grow"><span class="t-label"><b style="font-weight:600">${esc(v)}.</b> <span class="muted">${esc(l)}</span></span></div></li>`; }).join("")}</ul></div></div>
  <div class="phone-wrap" style="align-self:start">${realPhone(one(d, "shot"), "full")}</div></div>`;

L.monetisation = (d) => {
  const arch = ARCH;
  return `${hd(d, "wide")}<div class="mo"><div class="arch">${arch.map(([a, b], k) => `<div class="a${k}"><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join("")}</div>
  <ul class="list">${d.items.map((it) => { const [t, w, r, sc] = cells(it); return `<li><b class="t">${esc(t)}</b><span class="w">${esc(w)}</span><div class="score">${progress(Number(sc), 35)}<span class="t-data">${esc(sc)}</span></div><div class="rec">${badges(r, REC)}</div></li>`; }).join("")}</ul></div>`;
};

const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
L.partnerships = (d) => {
  const half = Math.ceil(d.items.length / 2);
  const list = (arr) => `<ul class="list">${arr.map((it) => { const [t, x] = cells(it); return `<li><h3>${CHECK}${esc(t)}</h3><p>${esc(x)}</p></li>`; }).join("")}</ul>`;
  return `<div class="pt"><div class="pt-l">${hd(d, "wide")}<div class="pt-grid">${list(d.items.slice(0, half))}${list(d.items.slice(half))}</div></div>${frame(one(d, "img"), "", "34% 50%")}</div>`;
};

L.gtm = (d) => `<div class="gt"><div class="gt-l">${hd(d, "wide")}<div class="gt-cards">${d.items.map((it, k) => { const [t, x] = cells(it); return `<div class="tint-${["sky", "sage", "sand", "clay"][k]}"><h3>${esc(t)}</h3><p>${esc(x)}</p></div>`; }).join("")}</div></div>
  <div class="gt-r">${frame(one(d, "img"), "", "50% 70%")}<div class="card"><h3>Approved trails in the repo, not samples</h3><ul class="trails">${d.trails.map((t) => { const [n, dist, km] = cells(t); return `<li><div class="nm">${esc(n)}<small>${esc(dist)}</small></div><span class="t-data">${esc(km)}</span></li>`; }).join("")}</ul><p class="note">${esc(TRAILS_NOTE)}</p></div></div></div>`;

L.roadmap = (d) => `<div class="rm-top">${hd(d, "wide")}<div class="rm-key">${badges("Built+In build+Planned+Hypothesis")}</div></div>
  <div class="rm">${d.phases.map((p, k) => { const [n, dt, th, gate] = cells(p); const items = d.items.filter((i) => cells(i)[0] === String(k + 1)); return `<div class="ph tint-${["sky", "sage", "sand", "clay"][k]}"><div class="ph-h"><h3>${esc(n)}</h3><div class="t-data">${esc(dt)}</div><p>${esc(th)}</p></div>
  <div class="ph-b"><ul>${items.map((i) => { const [, t, pr, st] = cells(i); const w = st.split("+")[0]; return `<li title="${esc(st)}"><span class="g ${STATUS[w][1]}">${STATUS[w][0]}</span><span class="t">${esc(t)}</span><span class="pr-c">${esc(pr)}</span></li>`; }).join("")}</ul><p class="gate"><b>Gate</b> ${esc(gate)}</p></div></div>`; }).join("")}</div>`;

// ---- charts (native SVG from the model) ----
const COL = { conservative: "#6b6560", base: "#1f4a6b", ambitious: "#b0442e" };
function barChart(W, H) {
  const ks = ["conservative", "base", "ambitious"]; const top = 26, base0 = Math.round(H * 0.56), bot = H - 46;
  const vals = ks.flatMap((k) => [model.scenarios[k].year.revenue, model.scenarios[k].year.opex, Math.abs(model.scenarios[k].year.net)]);
  const mx = Math.max(...vals); const up = (base0 - top) / mx, dn = (bot - base0) / mx;
  const gw = W / 3, bw = 84, gap = 20;
  let s = `<line x1="0" x2="${W}" y1="${base0}" y2="${base0}" stroke="#1a1a1a" stroke-opacity=".18" stroke-width="2"/>`;
  ks.forEach((k, gi) => {
    const y = model.scenarios[k].year; const gx = gi * gw + (gw - (3 * bw + 2 * gap)) / 2;
    [["Revenue", y.revenue, "#1f4a6b", up, 1], ["Opex", y.opex, "#6b6560", up, 0.38], ["Net", y.net, "#b0442e", y.net < 0 ? dn : up, 1]].forEach(([nm, v, c, sc, op], bi) => {
      const x = gx + bi * (bw + gap), h = Math.max(Math.abs(v) * sc, 3);
      const yy = v >= 0 ? base0 - h : base0; const ly = v >= 0 ? yy - 9 : yy + h + 24;
      const rr = Math.min(12, h / 2);
      const path = v >= 0 ? `M${x} ${yy + h}V${yy + rr}a${rr} ${rr} 0 0 1 ${rr} ${-rr}h${bw - 2 * rr}a${rr} ${rr} 0 0 1 ${rr} ${rr}V${yy + h}z` : `M${x} ${yy}V${yy + h - rr}a${rr} ${rr} 0 0 0 ${rr} ${rr}h${bw - 2 * rr}a${rr} ${rr} 0 0 0 ${rr} ${-rr}V${yy}z`;
      s += `<path d="${path}" fill="${c}" fill-opacity="${op}"/><text x="${x + bw / 2}" y="${ly.toFixed(1)}" text-anchor="middle" font-family="Geist Mono" font-weight="500" font-size="22" fill="#1a1a1a">${esc(inrShort(v))}</text>`;
    });
    s += `<text x="${gi * gw + gw / 2}" y="${H - 8}" text-anchor="middle" font-family="Geist" font-weight="500" font-size="23" fill="#58524d">${model.scenarios[k].label}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Year-one revenue, opex and net by scenario">${s}</svg>`;
}
function lineChart(W, H) {
  const ks = ["conservative", "base", "ambitious"]; const l = 78, r = 250, t = 12, b = 34;
  const cum = ks.map((k) => { let a = 0; return model.scenarios[k].rows.map((x) => (a += x.net)); });
  const mn = Math.min(...cum.flat(), 0), mxv = Math.max(...cum.flat(), 0);
  const X = (i) => l + (i / 11) * (W - l - r), Y = (v) => t + ((mxv - v) / (mxv - mn)) * (H - t - b);
  let s = ""; const step = 100000;
  for (let v = Math.ceil(mn / step) * step; v <= mxv; v += step) s += `<line x1="${l}" x2="${W - r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#1a1a1a" stroke-opacity="${v === 0 ? .22 : .08}" stroke-width="${v === 0 ? 2 : 1.5}"/><text x="${l - 10}" y="${Y(v) + 7}" text-anchor="end" font-family="Geist Mono" font-size="19" fill="#6b6560">${esc(inrShort(v))}</text>`;
  MONTHS.forEach((m, i) => { if (i % 3 === 0 || i === 11) s += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" font-family="Geist Mono" font-size="19" fill="#6b6560">${m}</text>`; });
  const ends = ks.map((k, ki) => ({ ki, y: Y(cum[ki][11]) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y < ends[i - 1].y + 28) ends[i].y = ends[i - 1].y + 28;
  const over = ends[ends.length - 1].y - (H - b - 10); if (over > 0) ends.forEach((e) => { e.y -= over; });
  ks.forEach((k, ki) => {
    s += `<polyline fill="none" stroke="${COL[k]}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" points="${cum[ki].map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}"/><circle cx="${X(11)}" cy="${Y(cum[ki][11]).toFixed(1)}" r="6" fill="${COL[k]}"/>`;
    const ly = ends.find((e) => e.ki === ki).y;
    s += `<text x="${X(11) + 16}" y="${(ly + 6).toFixed(1)}" font-family="Geist" font-weight="500" font-size="19" fill="${COL[k]}">${model.scenarios[k].label} <tspan font-family="Geist Mono">${esc(inrShort(cum[ki][11]))}</tspan></text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Cumulative net by month, three scenarios, all below zero">${s}</svg>`;
}
L.financials = (d) => `${hd(d, "wide")}
  <div class="fi"><div class="fi-l">
  <div class="card"><header><h3>Year one: revenue, opex, net</h3><div class="lg"><span><i style="background:#1f4a6b"></i>Revenue</span><span><i style="background:#6b6560;opacity:.38"></i>Opex</span><span><i style="background:#b0442e"></i>Net</span></div></header>${barChart(880, 172)}</div>
  <div class="card"><header><h3>Cumulative net by month</h3></header>${lineChart(880, 172)}</div></div>
  <div class="fi-r"><div class="card"><div class="fgrid"><span></span><span class="hh">Conserv.</span><span class="hh">Base</span><span class="hh">Ambit.</span>
  ${d.stats.map((s) => { const [v, l] = cells(s); const [a, b] = l.split(": "); const vs = v.split(" / "); return `<span class="row-line"></span><span class="lb"><b>${esc(a)}</b>${b ? esc(b) : ""}</span>${vs.map((x, i) => `<span class="vv${i === 1 ? " b" : ""}">${esc(x)}</span>`).join("")}`; }).join("")}</div></div></div></div>`;

L.competitive = (d) => `${hd(d, "wide")}
  <div class="cp"><div class="card"><div class="r h"><span>Capability</span><span>Myto today</span><span>Riding Verse, per the note</span><span>Evidence grade</span></div>
  ${d.items.map((it) => { const [c, s, o, e] = cells(it); return `<div class="r"><span class="c">${esc(c)}</span><span class="s">${badges(s)}</span><span class="o">${esc(o)}</span><span class="e">${esc(e)}</span></div>`; }).join("")}</div></div>`;

L.landscape = (d) => `${hd(d, "wide")}
  <div class="cp ls"><div class="card"><div class="r h"><span>App</span><span>What the listing shows</span><span>Where we stand</span></div>
  ${d.items.map((it) => { const [a, k, o, w] = cells(it); return `<div class="r"><span class="c">${esc(a)}<small>${esc(k)}</small></span><span class="e">${esc(o)}</span><span class="o">${esc(w)}</span></div>`; }).join("")}</div></div>`;

L["vision-long"] = (d) => `<!--ART--><div class="vl-art"><img src="${picture(one(d, "img"))}" alt=""${one(d, "imgpos") ? ` style="object-position:${esc(one(d, "imgpos"))}"` : ""}></div><!--/ART-->
  <div class="vl">${hd(d, "wide", "t-display")}<ul class="list">${d.items.map((it) => { const [t, x] = cells(it); return `<li><h3>${esc(t)}</h3><p>${esc(x)}</p></li>`; }).join("")}</ul></div>`;

// pitch deck only: a founder-story chapter, full-height art on the left, narrative and three pains on the right
L.story = (d) => `<!--ART--><div class="st-art"><img src="${picture(one(d, "img"))}" alt=""${one(d, "imgpos") ? ` style="object-position:${esc(one(d, "imgpos"))}"` : ""}></div><!--/ART-->
  <div class="st"><span class="st-ch">${esc(one(d, "chapter"))}</span>${hd(d, "wide", "t-display")}<div class="st-pains">${d.items.map((it, k) => { const [t, x] = cells(it); return `<div class="tint-${["sand", "clay", "sky"][k]}"><span class="num">${k + 1}</span><h3>${esc(t)}</h3><p>${esc(x)}</p></div>`; }).join("")}</div></div>`;

// pitch deck only: product slide with a demo video slot (poster + play until a video file is given)
L.demo = (d) => {
  const video = one(d, "video");
  const poster = shotFile(one(d, "shot"));
  const screen = video
    ? `<video controls preload="metadata" poster="${poster}" src="assets/video/${esc(video)}"></video>`
    : `<img src="${poster}" alt=""><span class="play" aria-label="Demo video, to be added"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg></span>`;
  return `<div class="dm"><div class="dm-a">${hd(d, "wide")}<div class="dm-cards">${d.items.map((it, k) => { const [t, x] = cells(it); return `<div class="tint-${["sky", "sage", "sand"][k]}"><span class="num">${k + 1}</span><h3>${esc(t)}</h3><p>${esc(x)}</p></div>`; }).join("")}</div></div>
  <div class="phone-wrap"><div class="phone full"><div class="scr">${screen}</div></div></div></div>`;
};

// pitch deck only: the raise, with the four phases as the use of funds
L.ask = (d) => {
  const [v, l, st] = cells(one(d, "raise"));
  return `<div class="gt"><div class="gt-l">${hd(d, "wide")}<div class="gt-cards">${d.items.map((it, k) => { const [t, x, g] = cells(it); return `<div class="tint-${["sky", "sage", "sand", "clay"][k]}"><h3>${esc(t)}</h3><p>${esc(x)}</p><p class="gate">${esc(g)}</p></div>`; }).join("")}</div></div>
  <div class="gt-r">${frame(one(d, "img"), "", "50% 70%")}<div class="card"><h3>Raising</h3><div class="stat hero"><b>${esc(v)}</b><span>${esc(l)}</span></div>${badges(st)}<p class="note">${esc(one(d, "note"))}</p></div></div></div>`;
};

// ---------- assemble ----------
const total = slides.length;
const sec = slides.map((d) => {
  if (!L[d.layout]) throw new Error(`No layout "${d.layout}" (slide ${d.n})`);
  const status = one(d, "status");
  const isDraft = /^(Draft|Confidential)/.test(status);
  const stBadges = !status ? "" : isDraft ? `<span class="badge plain">${G.dash}${esc(status.replace(", ", " · "))}</span>` : badges(status);
  const noteParts = [one(d, "caption"), one(d, "assumptions"), one(d, "sources") && `Sources: ${one(d, "sources")}.`].filter(Boolean);
  const note = noteParts.join(" ");
  if (note.length > 300) console.warn(`slide ${d.n}: footer note is ${note.length} chars (keep under ~300)`);
  let inner = L[d.layout](d); let art = "";
  inner = inner.replace(/<!--ART-->([\s\S]*?)<!--\/ART-->/, (_, a) => { art = a; return ""; });
  return `<div class="cell" data-n="${d.n}"><section class="slide l-${d.layout}" id="s${d.n}" aria-label="Slide ${d.n} of ${total}">
<header class="s-head">${LOGO}<span class="sect">${esc(one(d, "kicker"))}</span><span class="badges">${stBadges}</span></header>
${art}
<div class="s-body">${inner}</div>
<footer class="s-foot"><span class="pg">${pad(d.n)} / ${pad(total)}</span><p class="note">${esc(note)}</p></footer>
</section></div>`;
}).join("\n");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${DECK === "pitch" ? "Myto investor pitch" : "Myto strategy deck"}</title>
<link rel="stylesheet" href="styles.css">
</head><body>
<!-- GENERATED by build.mjs from deck-content.md and ../model.mjs. Do not edit by hand. -->
<main id="deck" aria-live="polite">
${sec}
</main>
<nav id="ui" aria-label="Slide controls"><button id="prev" aria-label="Previous slide">‹</button><span id="count">1 / ${total}</span><button id="next" aria-label="Next slide">›</button><button id="ov" aria-label="Overview grid (G)">Overview</button><button id="pm" aria-label="Presentation mode (P)">Present</button></nav>
<script src="presentation.js"></script>
</body></html>
`;
const OUT = DECK === "pitch" ? "index-pitch.html" : "index.html";
writeFileSync(join(here, OUT), html);
console.log(`${OUT} written: ${total} slides`);
