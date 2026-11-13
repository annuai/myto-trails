#!/usr/bin/env node
// Generates exports/myto-strategy-deck.pptx from deck-content.md + ../model.mjs (via deck-data.mjs), the same sources as index.html.
// Text, shapes, tables and charts are native PowerPoint objects; only the illustrations and the app screenshots are pictures.
// Usage: node build-pptx.mjs   (or `npm run deck:pptx` from the repo root)
// Layout units: every coordinate below is in "stage px" of a 1000 x 563 reference (the same grid the HTML slide is scaled onto).
import pptxgen from "pptxgenjs";
import sharp from "sharp";
import JSZip from "jszip";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { MONTHS, inrShort } from "../model.mjs";
import { here, slides, model, cells, one, ARCH, TRAILS_NOTE, DECK } from "./deck-data.mjs";

const PITCH = DECK === "pitch";
const OUT = join(here, "exports", PITCH ? "myto-pitch-deck.pptx" : "myto-strategy-deck.pptx");
const U = 13.3333 / 1000; // reference px -> inches
const u = (v) => v * U;
const PT = 0.96; // 1 reference px = 0.96 pt

// ---------- theme: the app's light palette (packages/tokens/src/mobile.ts), see styles.css ----------
const THEME = {
  name: "Myto", headFontFace: "Michroma", bodyFontFace: "Geist",
  colors: { dk1: "1A1A1A", lt1: "FBF9F6", dk2: "6B6560", lt2: "F2EDE8", accent1: "1F4A6B", accent2: "CFDDE8", accent3: "CFE0C8", accent4: "E8DCCB", accent5: "EFCFC2", accent6: "2D6A3E", hlink: "8A5A00", folHlink: "B0442E" },
};
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.title = PITCH ? "Myto investor pitch" : "Myto strategy deck"; pres.author = "Myto"; pres.company = "Myto"; pres.subject = "Strategy and plan, Nov 2026 to Oct 2027";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;
const COL = { ink: C.text1, muted: C.text2, card: C.background1, paper: C.background2, accent: C.accent1, sky: C.accent2, sage: C.accent3, sand: C.accent4, clay: C.accent5, good: C.accent6 };
const HEX = { caution: "8A5A00", record: "B0442E", hair: "1A1A1A", barGrey: "C4C1BD", white: "FFFFFF" };
const TINTS = [COL.sky, COL.sage, COL.sand, COL.clay]; // sky, sage, sand, clay: slides 14 and 15
const TINTS_B = [COL.sky, COL.clay, COL.sand, COL.sage]; // slides 2 and 6
const F = { disp: "Michroma", text: "Geist", mono: "Geist Mono" };
// type roles in pt: [size, line height] = app role x 1.75 x 0.5
const R = { hero: [22.75, 29.75], title: [21, 28], section: [18.4, 24.5], body: [14.9, 21], label: [13.1, 17.5], caption: [11.4, 15.75], data: [21, 26.25], display: [34.1, 44.6], small: [10.5, 14.5] };

// ---------- helpers ----------
const wrapCount = (text, w, pt, em = 0.47) => { // estimated wrapped line count, used only to stack blocks
  const cw = (em * pt) / PT, max = Math.max(1, Math.floor(w / cw)); let n = 1, cur = 0;
  for (const word of String(text).split(" ")) { const l = word.length; if (cur && cur + 1 + l > max) { n++; cur = l; } else cur += (cur ? 1 : 0) + l; }
  return n;
};
const hOf = (lines, lh) => (lines * lh) / PT;

function T(s, text, x, y, w, h, o = {}) {
  const [pt, lh] = o.role ? R[o.role] : [o.pt ?? R.body[0], o.lh ?? R.body[1]];
  s.addText(text, {
    x: u(x), y: u(y), w: u(w), h: u(h), isTextBox: true, margin: 0, valign: o.valign || "top", align: o.align || "left",
    fontFace: o.font || F.text, fontSize: pt, lineSpacing: lh, color: o.color || COL.ink, bold: !!o.bold, italic: !!o.italic, wrap: o.wrap !== false, objectName: o.name,
    charSpacing: o.cs,
  });
}
function rr(s, x, y, w, h, fill, o = {}) {
  const r = Math.min(o.r ?? 22, Math.min(w, h) / 2);
  s.addShape(o.shape || pres.shapes.ROUNDED_RECTANGLE, {
    x: u(x), y: u(y), w: u(w), h: u(h), rectRadius: u(r), fill: fill ? { color: fill, transparency: o.t ?? 0 } : { type: "none" },
    line: o.line ? { color: o.line, width: o.lw ?? 0.75, transparency: o.lt ?? 0, dashType: o.dash } : { type: "none" }, objectName: o.name,
    shadow: o.shadow ? { type: "outer", color: HEX.hair, opacity: 0.12, blur: 8, offset: 2, angle: 90 } : undefined,
  });
}
const card = (s, x, y, w, h, fill = COL.card, o = {}) => rr(s, x, y, w, h, fill, { r: 22, ...o });
function hair(s, x, y, w, o = {}) { s.addShape(pres.shapes.LINE, { x: u(x), y: u(y), w: u(w), h: 0, line: { color: o.color || COL.ink, width: 0.75, transparency: o.t ?? 88 }, objectName: "Divider" }); }

// ---------- icons (the app's glyph set, 16 unit grid) ----------
const GL = {
  check: (c) => `<path d="M3 8.5l3.2 3.2L13 4.5" stroke="${c}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  half: (c) => `<circle cx="8" cy="8" r="5.6" stroke="${c}" stroke-width="1.8" fill="none"/><path d="M8 2.4a5.6 5.6 0 0 1 0 11.2z" fill="${c}"/>`,
  dash: (c) => `<circle cx="8" cy="8" r="5.6" stroke="${c}" stroke-width="1.8" fill="none" stroke-dasharray="2.2 2.4"/>`,
  help: (c) => `<circle cx="8" cy="8" r="5.8" stroke="${c}" stroke-width="1.8" fill="none"/><path d="M6.3 6.4a1.8 1.8 0 1 1 2.6 1.6c-.6.4-.9.8-.9 1.4M8 11.5v.1" stroke="${c}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  sq: (c) => `<rect x="2.8" y="2.8" width="10.4" height="10.4" rx="3" stroke="${c}" stroke-width="1.8" fill="none" stroke-dasharray="2.4 2.2"/>`,
};
const STATUS = { "Built": ["check", "2D6A3E"], "In build": ["half", "1F4A6B"], "Planned": ["dash", "6B6560"], "Hypothesis": ["help", "8A5A00"] };
const REC = { Implement: ["check", "2D6A3E"], Validate: ["half", "1F4A6B"], Defer: ["dash", "6B6560"] };
const ICONS = {};
async function prepIcons() {
  const all = [...Object.values(STATUS), ...Object.values(REC), ["sq", "6B6560"]];
  for (const [g, c] of all) {
    const key = g + c; if (ICONS[key]) continue;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">${GL[g]("#" + c)}</svg>`;
    ICONS[key] = "image/png;base64," + (await sharp(Buffer.from(svg), { density: 1100 }).resize(128, 128).png().toBuffer()).toString("base64");
  }
}
const icon = (s, g, c, x, y, size = 16, alt = "") => s.addImage({ data: ICONS[g + c], x: u(x), y: u(y), w: u(size), h: u(size), altText: alt || g, objectName: "Status icon" });

// A status pill: glyph + word, sized to its text. Returns its width.
const pillW = (word) => 40 + 6.8 * word.length;
function pill(s, x, y, word, table = STATUS, o = {}) {
  const [g, c] = table[word]; const w = pillW(word), h = o.h ?? 28;
  rr(s, x, y, w, h, o.fill ?? HEX.white, { r: h / 2, t: o.t ?? 40, name: `Status: ${word}` });
  icon(s, g, c, x + 11, y + (h - 15) / 2, 15, word);
  T(s, word, x + 31, y, w - 33, h, { role: "label", color: o.color ?? ("#" + c).slice(1), valign: "middle", wrap: false, name: `Status label: ${word}` });
  return w;
}
function pills(s, x, y, str, table = STATUS, o = {}) { let cx = x; for (const w of str.split("+").map((v) => v.trim()).filter(Boolean)) cx += pill(s, cx, y, w, table, o) + 8; return cx - x - 8; }
const pillsWidth = (str) => str.split("+").map((v) => pillW(v.trim())).reduce((a, b) => a + b + 8, -8);

// ---------- pictures: cropped and rounded in sharp so they stay light and look like the HTML ----------
const SC = 1.8;
function assetPath(stem) {
  for (const ext of ["jpg", "webp"]) { const f = join(here, "assets/opt", `${stem}.${ext}`); if (existsSync(f)) return f; }
  for (const dir of ["img", "pending"]) { const f = join(here, "assets", dir, stem + ".webp"); if (existsSync(f)) return f; }
  throw new Error(`Image not found: ${stem}`);
}
const stemOf = (f) => f.replace(/\.(webp|jpg|png)$/, "");
const maskSvg = (w, h, r, topOnly) => topOnly
  ? `<svg width="${w}" height="${h}"><path d="M0 ${h}V${r}a${r} ${r} 0 0 1 ${r} ${-r}H${w - r}a${r} ${r} 0 0 1 ${r} ${r}V${h}z" fill="#fff"/></svg>`
  : `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`;
async function pic(file, w, h, o = {}) { // w,h in reference px; o: pos [x%,y%], r, top, contain, fade, shot
  const W = Math.round(w * SC), H = Math.round(h * SC);
  const src = o.shot ? join(here, "assets/shots", file) : assetPath(stemOf(file));
  let img;
  if (o.contain) img = sharp(src).resize(W, H, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  else {
    const m = await sharp(src).metadata(); const k = Math.max(W / m.width, H / m.height);
    const rw = Math.max(W, Math.round(m.width * k)), rh = Math.max(H, Math.round(m.height * k)); const [px, py] = o.pos || [50, 50];
    img = sharp(await sharp(src).resize(rw, rh).toBuffer()).extract({ left: Math.round((rw - W) * px / 100), top: Math.round((rh - H) * py / 100), width: W, height: H });
  }
  if (o.fade) { // the cover: paper fades in over the top of the art
    const g = `<svg width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2ede8" stop-opacity="1"/><stop offset=".24" stop-color="#f2ede8" stop-opacity="0"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`;
    img = sharp(await img.toBuffer()).composite([{ input: Buffer.from(g) }]);
  }
  if (o.r || o.contain) {
    if (o.r) img = sharp(await img.png().toBuffer()).composite([{ input: Buffer.from(maskSvg(W, H, Math.round(o.r * SC), o.top)), blend: "dest-in" }]);
    return "image/png;base64," + (await img.png({ compressionLevel: 9 }).toBuffer()).toString("base64");
  }
  return "image/jpeg;base64," + (await img.jpeg({ quality: 86, mozjpeg: true }).toBuffer()).toString("base64");
}
async function addPic(s, file, x, y, w, h, o = {}) {
  s.addImage({ data: await pic(file, w, h, o), x: u(x), y: u(y), w: u(w), h: u(h), altText: o.alt || "Illustration", objectName: o.name || "Illustration" });
}

// ---------- layouts ----------
async function bgImage() {
  const svg = `<svg width="1920" height="1080"><defs><linearGradient id="g" x1="0.33" y1="0" x2="0.67" y2="1"><stop offset="0" stop-color="#f8f4ef"/><stop offset=".45" stop-color="#f2ede8"/><stop offset="1" stop-color="#e7ebee"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#g)"/></svg>`;
  return "image/jpeg;base64," + (await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer()).toString("base64");
}
let LOGO;
async function prepLogo() {
  const svg = readFileSync(join(here, "assets/img/myto-logo.svg"), "utf8").replace(/fill="white"/g, 'fill="#1A1A1A"');
  LOGO = "image/png;base64," + (await sharp(Buffer.from(svg), { density: 600 }).resize({ width: 372 }).png().toBuffer()).toString("base64");
}
const numStyle = (x) => ({ x: u(x), y: u(522), w: u(70), h: u(20), fontFace: F.mono, fontSize: 10.5, color: COL.muted });
function defineLayouts(bg) {
  pres.defineSlideMaster({ title: "Myto cover", background: { data: bg }, objects: [] });
  pres.defineSlideMaster({ title: "Myto content", background: { data: bg }, slideNumber: numStyle(43), objects: [] });
  pres.defineSlideMaster({ title: "Myto content, art on the left", background: { data: bg }, slideNumber: numStyle(409), objects: [] });
}

// ---------- slide frame ----------
const TOTAL = slides.length;
function frame(d, master, o = {}) {
  const s = pres.addSlide({ masterName: master, sectionTitle: SECTION_OF(d.n) });
  const right = o.right ?? 945;
  s.addImage({ data: LOGO, x: u(o.logoX ?? 43), y: u(30), w: u(62), h: u(28.6), altText: "Myto", objectName: "Logo" });
  const status = one(d, "status"), draft = /^(Draft|Confidential)/.test(status);
  let cx = right;
  if (draft) { const txt = status.replace(", ", " · "); const w = 34 + 6.4 * txt.length; icon(s, "dash", "6B6560", cx - w + 4, 36, 15, "Draft"); T(s, txt, cx - w + 26, 33, w - 26, 20, { role: "label", color: COL.muted, wrap: false, valign: "middle", name: "Status" }); cx -= w + 10; }
  else if (status) { const sw = pillsWidth(status); pills(s, cx - sw, 29, status, STATUS, { t: 100 }); cx -= sw + 14; }
  T(s, one(d, "kicker"), cx - 320, 33, 320, 20, { role: "label", color: COL.muted, align: "right", valign: "middle", wrap: false, bold: false, name: "Section label" });
  // footer note
  const parts = [one(d, "caption"), one(d, "assumptions"), one(d, "sources") && `Sources: ${one(d, "sources")}.`].filter(Boolean);
  if (parts.length && o.note !== false) T(s, parts.join(" "), o.noteX ?? 120, 499, o.noteW ?? 825, 36, { role: "caption", pt: 11, lh: 15.4, color: COL.muted, name: "Footnote" });
  return s;
}
function heading(s, d, x, y, w, o = {}) { // headline + sub; returns bottom y
  const head = one(d, "headline"), sub = one(d, "sub");
  const [pt, lh] = o.display ? R.display : R.hero; const n = wrapCount(head, w, pt, 0.62);
  T(s, head, x, y, w, hOf(n, lh), { font: F.disp, pt, lh, name: "Title" });
  const by = y + hOf(n, lh) + 8;
  if (sub) { const sn = wrapCount(sub, w, R.body[0]); T(s, sub, x, by, w, hOf(sn, R.body[1]), { color: COL.muted, name: "Subtitle" }); return by + hOf(sn, R.body[1]); }
  return by;
}
const bodyZoneTitle = (s, d, x = 43, w = 700) => heading(s, d, x, 87, w);

const SECTIONS = PITCH ? [["Story", 1, 5], ["Product", 6, 7], ["Market and business", 8, 11], ["Proof, vision and the raise", 12, 15]] : [["Opening", 1, 2], ["Problem and audience", 3, 5], ["Product", 6, 11], ["Business model", 12, 16], ["Positioning and vision", 17, 19]];
const SECTION_OF = (n) => SECTIONS.find(([, a, b]) => n >= a && n <= b)[0];

// definition list (title + text, hairlines between), used on slides 9 and 10
function defList(s, items, x, y0, w, gap = 64) {
  items.forEach((it, k) => {
    const [t, tx] = cells(it); const y = y0 + k * gap;
    T(s, t, x, y, w, 24, { role: "section", pt: 14.9, lh: 20.5, bold: true, name: "Item title" });
    T(s, tx, x, y + 25, w, 22, { role: "label", pt: 13.1, color: COL.muted, name: "Item text" });
    if (k < items.length - 1) hair(s, x, y + gap - 11, w);
  });
}

// ---------- phone mock-ups (concept, drawn from the app code; see build.mjs shopPhone / marksPhone) ----------
function phoneFrame(s, x, y, w, h) {
  rr(s, x, y, w, h, COL.card, { r: 30, shadow: true, name: "Phone frame" });
  rr(s, x + 6, y + 6, w - 12, h - 12, COL.paper, { r: 25, name: "Phone screen" });
}
const conceptTag = (s) => { const w = 192; rr(s, 755, 76, w + 3, 24, COL.card, { r: 12, shadow: true, name: "Concept tag" }); icon(s, "sq", "6B6560", 763, 80, 15, "Concept"); T(s, "Concept, not a screenshot", 783, 76, 170, 24, { role: "label", pt: 11.5, lh: 15, valign: "middle", wrap: false, name: "Concept tag text" }); };
function mini(s, t, x, y, w, o = {}) { T(s, t, x, y, w, o.h ?? 10, { pt: o.pt ?? 5, lh: (o.pt ?? 5) * 1.3, color: o.color ?? COL.muted, bold: o.bold, font: o.font, align: o.align, name: "Mockup text" }); }
function shopPhone(s) {
  conceptTag(s); phoneFrame(s, 764, 100, 192, 378);
  mini(s, "‹ Home", 780, 111, 60, { color: COL.ink, pt: 5.5 });
  T(s, "Shop", 780, 124, 100, 12, { font: F.disp, pt: 8, lh: 10, name: "Mockup title" });
  mini(s, "Gear we picked for the road. You buy it on myto-moto.com, not in the app.", 780, 141, 150, { h: 16, pt: 4.8 });
  mini(s, "Featured", 780, 172, 100, { color: COL.ink, bold: true, pt: 5.5 });
  [["Trail Beam", "Light that cuts through every condition."], ["Trail Kit", "Everything you need. Organised where you need it."], ["Navi", "Navigate. Nothing else."]].forEach(([n, t], k) => {
    const y = 186 + k * 72; card(s, 776, y, 168, 62, COL.card, { r: 9 });
    rr(s, 786, y + 10, 14, 14, COL.paper, { r: 3 }); mini(s, n, 808, y + 9, 120, { color: COL.ink, bold: true, pt: 5.2 }); mini(s, t, 808, y + 18, 124, { h: 14, pt: 4.4 });
    rr(s, 786, y + 40, 64, 11, COL.paper, { r: 5.5 }); mini(s, "Pre-order on the website", 786, y + 40, 64, { h: 11, align: "center", color: COL.ink, pt: 4 });
  });
  card(s, 776, 404, 168, 66, COL.card, { r: 9 }); rr(s, 784, 412, 152, 22, COL.paper, { r: 7 });
  mini(s, "Visit myto-moto.com", 784, 418, 152, { align: "center", color: COL.ink, pt: 5.2 }); mini(s, "Opens the website in your browser. You leave Myto Moto to buy.", 784, 442, 152, { h: 14, pt: 4.2 });
}
function marksPhone(s) {
  conceptTag(s); phoneFrame(s, 764, 100, 192, 378);
  mini(s, "‹ You", 780, 111, 60, { color: COL.ink, pt: 5.5 });
  T(s, "Marks", 780, 124, 100, 12, { font: F.disp, pt: 8, lh: 10, name: "Mockup title" });
  mini(s, "First times, badges and thank-yous. Nothing here is about speed.", 780, 141, 150, { h: 16, pt: 4.8 });
  mini(s, "Exploration", 780, 170, 100, { pt: 4.6 });
  card(s, 776, 181, 168, 56, COL.card, { r: 9 });
  s.addShape(pres.shapes.OVAL, { x: u(786), y: u(192), w: u(22), h: u(22), fill: { type: "none" }, line: { color: COL.muted, width: 0.75, dashType: "dash" }, objectName: "Badge stamp" });
  mini(s, "Weekend Wanderer", 816, 190, 110, { pt: 5.2 }); mini(s, "Ride on 5 different weekends.", 816, 199, 120, { pt: 4.4 });
  rr(s, 816, 209, 112, 3.5, COL.muted, { r: 2, t: 70 }); rr(s, 816, 209, 45, 3.5, COL.ink, { r: 2 }); mini(s, "2 of 5", 816, 217, 60, { pt: 4.4 });
  mini(s, "Trailmarks", 780, 252, 100, { color: COL.ink, bold: true, pt: 5.5 });
  card(s, 776, 265, 168, 58, COL.card, { r: 9 }); T(s, "12", 786, 272, 60, 14, { font: F.disp, pt: 9, lh: 11, name: "Mockup figure" });
  mini(s, "A thank-you for helping the map, not money or crypto. They can't be bought, sold or cashed out.", 786, 292, 150, { h: 22, pt: 4.4 });
  mini(s, "Challenges", 780, 336, 100, { color: COL.ink, bold: true, pt: 5.5 });
  card(s, 776, 349, 168, 74, COL.card, { r: 9 });
  mini(s, "Visit 5 scenic viewpoints", 786, 357, 130, { color: COL.ink, bold: true, pt: 5.2 }); mini(s, "Optional. Nothing counts until you join.", 786, 366, 140, { pt: 4.4 });
  rr(s, 786, 390, 148, 22, COL.paper, { r: 7 }); mini(s, "Join challenge", 786, 396, 148, { align: "center", color: COL.ink, pt: 5.2 });
}

// ---------- slide builders ----------
const B = {};

B.cover = async (d) => {
  const s = frame(d, "Myto cover", { note: false });
  await addPic(s, one(d, "img"), 0, 230, 1000, 333, { fade: true, alt: "A rider on an adventure motorcycle on a mountain ridge", name: "Cover art" });
  T(s, one(d, "sub"), 43, 133, 640, 100, { font: F.disp, pt: R.display[0], lh: R.display[1], name: "Title" });
  T(s, (d.body || [])[0], 43, 240, 700, 24, { color: COL.muted, name: "Subtitle" });
  const cap = one(d, "caption"); const w = Math.min(900, 40 + cap.length * 5.8);
  rr(s, 43, 503, w, 30, "13161C", { r: 15, name: "Cover note" });
  T(s, cap, 59, 503, w - 28, 30, { role: "caption", pt: 10.8, lh: 14, color: "FFFFFF", valign: "middle", wrap: false, name: "Footnote" });
  return s;
};

B.vision = async (d) => {
  const s = frame(d, "Myto content");
  heading(s, d, 43, 87, 360);
  await addPic(s, one(d, "img"), 43, 234, 411, 245, { r: 22, pos: [42, 50], alt: "A rider on a mountain ridge" });
  d.items.forEach((it, k) => {
    const [t, st, tx] = cells(it); const x = 484 + (k % 2) * 243, y = 88 + Math.floor(k / 2) * 203;
    card(s, x, y, 229, 188, TINTS_B[k], { name: `Card: ${t}` });
    T(s, t, x + 21, y + 21, 190, 28, { role: "section", bold: true, name: "Card title" });
    T(s, tx, x + 21, y + 67, 190, 72, { name: "Card text" });
    pills(s, x + 21, y + 137, st);
  });
  return s;
};

B.problem = async (d) => {
  const s = frame(d, "Myto content");
  heading(s, d, 43, 87, 530);
  await addPic(s, one(d, "img"), 43, 211, 347, 267, { r: 22, alt: "Riders on a trail, one stopped with an incident" });
  card(s, 413, 211, 543, 267, COL.card, { name: "Problem list" });
  d.items.forEach((it, k) => {
    const [t, tx] = cells(it); const step = 251.2 / d.items.length; const y = 211 + 8 + k * step + (step - 62.8) / 2;
    T(s, String(k + 1), 432, y + 14, 36, 34, { font: F.disp, pt: 19, lh: 26, color: COL.accent, name: "Number" });
    T(s, t, 481, y + 12, 460, 22, { role: "body", bold: true, name: "Item title" });
    T(s, tx, 481, y + 34, 460, 20, { role: "label", color: COL.muted, name: "Item text" });
    if (k < d.items.length - 1) hair(s, 430, y + 58 + (step - 62.8) / 2, 508);
  });
  return s;
};

B.audience = async (d) => {
  const s = frame(d, "Myto content");
  heading(s, d, 43, 87, 900);
  await addPic(s, one(d, "img"), 43, 181, 192, 297, { r: 22, pos: [30, 50], alt: "Riders gathered beside their motorcycles" });
  const fills = [COL.sage, COL.sky, COL.sand];
  d.items.forEach((it, k) => {
    const [t, pay, tx] = cells(it); const x = 258 + k * 240, y = 181, w = 218, h = 297;
    card(s, x, y, w, h, fills[k], { name: `Card: ${t}` });
    T(s, t, x + 21, y + 21, w - 40, 26, { role: "section", bold: true, name: "Card title" });
    T(s, tx, x + 21, y + 62, w - 42, 100, { name: "Card text" });
    const [lab, val] = pay.split(": ");
    T(s, lab, x + 21, y + h - 108, w - 42, 16, { role: "label", color: COL.muted, name: "Label" });
    T(s, val, x + 21, y + h - 86, w - 36, 64, { font: F.disp, pt: 21, lh: 28, name: "Value" });
  });
  return s;
};

B.opportunity = async (d) => {
  const s = frame(d, "Myto content, art on the left", { logoX: 409, noteX: 485, noteW: 470 });
  await addPic(s, one(d, "img"), 0, 0, 365, 563, { pos: [38, 50], alt: "A road winding below a globe", name: "Side art" });
  heading(s, d, 409, 87, 405);
  const names = [...new Set(d.items.map((i) => cells(i)[0]))];
  const groups = names.map((n, k) => [n, cells(d.items.find((i) => cells(i)[0] === n))[1], d.items.filter((i) => cells(i)[0] === n), [COL.sage, COL.sky][k], 409 + k * 284]);
  groups.forEach(([title, st, items, fill, x]) => {
    card(s, x, 211, 263, 267, fill, { name: `Card: ${title}` });
    T(s, title, x + 21, 233, 130, 28, { role: "section", bold: true, name: "Card title" });
    pill(s, x + 263 - 21 - pillW(st), 229, st);
    let y = 273;
    items.forEach((it, k) => {
      const tx = cells(it)[2]; const n = wrapCount(tx, 222, R.label[0]);
      if (k) { hair(s, x + 21, y - 8, 222); }
      T(s, tx, x + 21, y, 222, hOf(n, R.label[1]), { role: "label", name: "Item" }); y += hOf(n, R.label[1]) + 18;
    });
  });
  return s;
};

B.solution = async (d) => {
  const s = frame(d, "Myto content");
  heading(s, d, 43, 87, 700);
  for (const [k, it] of d.items.entries()) {
    const [t, st, tx, img] = cells(it); const x = 43 + k * 234, y = 181, w = 212, h = 297;
    card(s, x, y, w, h, TINTS_B[k], { name: `Card: ${t}` });
    if (/^adventure-body/.test(img)) { rr(s, x + 18, y + 18, 176, 100, COL.card, { r: 18, name: "Image panel" }); await addPic(s, img, x + 26, y + 22, 160, 92, { contain: true, alt: "Rider and loaded motorcycle cut-out" }); }
    else await addPic(s, img, x + 18, y + 18, 176, 100, { r: 18, alt: `${t} illustration` });
    T(s, t, x + 18, y + 131, w - 30, 28, { role: "section", bold: true, name: "Card title" });
    const n = wrapCount(tx, 176, R.label[0]); T(s, tx, x + 18, y + 164, 176, hOf(n, R.label[1]) + 2, { role: "label", color: COL.muted, name: "Card text" });
    pills(s, x + 18, y + 164 + hOf(n, R.label[1]) + 10, st);
  }
  return s;
};

B.product = async (d) => {
  const s = frame(d, "Myto content");
  T(s, one(d, "headline"), 43, 87, 700, 34, { font: F.disp, pt: R.hero[0], lh: R.hero[1], name: "Title" });
  for (const [k, it] of d.items.entries()) {
    const [f, c] = cells(it); const [a, b] = c.split(": "); const x = 43 + k * 235.5;
    T(s, a, x, 150, 215, 24, { role: "section", bold: true, name: "Screen name" });
    T(s, b[0].toUpperCase() + b.slice(1), x, 173, 210, 40, { role: "label", color: COL.muted, name: "Screen text" });
    rr(s, x + 11, 225, 184, 253, COL.card, { r: 30, shape: pres.shapes.ROUND_2_SAME_RECTANGLE, name: "Phone frame" });
    await addPic(s, f, x + 18, 232, 170, 246, { shot: true, r: 22, top: true, pos: [50, 0], alt: `${a} screen from the test build`, name: `Screenshot: ${a}` });
  }
  return s;
};

// flywheel: 5 nodes on a circle, arcs between them, all native shapes
function flywheel(s, d) {
  const cx = 257, cy = 290, R0 = 60, r = 17, n = d.items.length; const fills = [COL.sky, COL.sage, COL.sand, COL.clay, COL.sky];
  const pol = (deg, rad = R0) => [cx + rad * Math.cos((deg * Math.PI) / 180), cy + rad * Math.sin((deg * Math.PI) / 180)];
  const half = (Math.asin((r + 7) / R0) * 180) / Math.PI;
  for (let k = 0; k < n; k++) { // an arc from node k to node k+1, drawn as a chord-free polyline with an arrow head
    const a1 = -90 + (360 / n) * k + half, a2 = -90 + (360 / n) * (k + 1) - half; const pts = [];
    for (let i = 0; i <= 14; i++) { const [x, y] = pol(a1 + ((a2 - a1) * i) / 14); pts.push([x, y]); }
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
    s.addShape(pres.shapes.CUSTOM_GEOMETRY, {
      x: u(x0), y: u(y0), w: u(Math.max(w, 0.1)), h: u(Math.max(h, 0.1)), fill: { type: "none" }, line: { color: COL.accent, width: 1.75, endArrowType: "triangle" }, objectName: `Flywheel arrow ${k + 1}`,
      points: pts.map(([x, y], i) => ({ x: u(x - x0), y: u(y - y0), ...(i === 0 ? { moveTo: true } : {}) })),
    });
  }
  const lab = [["Ride", "t"], ["Contribute", "r"], ["Moderate", "r"], ["Trust", "l"], ["More riders", "l"]];
  d.items.forEach((it, k) => {
    const [num, name] = cells(it); const [x, y] = pol(-90 + (360 / n) * k);
    s.addShape(pres.shapes.OVAL, { x: u(x - r), y: u(y - r), w: u(2 * r), h: u(2 * r), fill: { color: fills[k] }, line: { type: "none" }, objectName: `Flywheel node ${num}` });
    T(s, num, x - r, y - r, 2 * r, 2 * r, { font: F.disp, pt: 11, lh: 14, align: "center", valign: "middle", color: COL.accent, name: "Node number" });
    const side = lab[k][1];
    if (side === "t") T(s, name, x - 50, y - r - 24, 100, 16, { role: "label", bold: true, align: "center", name: "Node label" });
    else if (side === "r") T(s, name, x + r + 6, y - 8, 110, 16, { role: "label", bold: true, name: "Node label" });
    else T(s, name, x - r - 6 - 110, y - 8, 110, 16, { role: "label", bold: true, align: "right", name: "Node label" });
  });
  T(s, "Trusted\ndirectory", cx - 40, cy - 12, 80, 28, { font: F.disp, pt: 6.5, lh: 9, align: "center", name: "Wheel centre" });
}
B.flywheel = async (d) => {
  const s = frame(d, "Myto content");
  heading(s, d, 43, 87, 345); flywheel(s, d);
  d.stats.forEach((st, k) => {
    const [v, l] = cells(st); const x = 43 + k * 222;
    card(s, x, 387, 207, 92, [COL.sage, COL.sky][k], { name: `Stat: ${v}` });
    T(s, v, x + 19, 402, 180, 28, { font: F.mono, pt: R.data[0], lh: R.data[1], bold: false, name: "Stat value" });
    T(s, l, x + 19, 436, 175, 36, { role: "caption", pt: 10.5, lh: 14.5, color: COL.muted, name: "Stat label" });
  });
  await addPic(s, one(d, "img"), 502, 88, 454, 86, { r: 22, pos: [50, 78], alt: "Two riders stopped beside a stream" });
  card(s, 502, 190, 454, 289, COL.card, { name: "Flywheel list" });
  const fills = [COL.sky, COL.sage, COL.sand, COL.clay, COL.sky];
  d.items.forEach((it, k) => {
    const [num, t, tx, st] = cells(it); const y = 190 + 8 + k * 57.6;
    s.addShape(pres.shapes.OVAL, { x: u(519), y: u(y + 11), w: u(32), h: u(32), fill: { color: fills[k] }, line: { type: "none" }, objectName: `Number ${num}` });
    T(s, num, 519, y + 11, 32, 32, { font: F.disp, pt: 10, lh: 13, align: "center", valign: "middle", color: COL.accent, name: "Number" });
    T(s, t, 565, y + 8, 250, 20, { role: "body", bold: true, name: "Item title" });
    T(s, tx, 565, y + 29, 300, 18, { role: "label", pt: 12.2, color: COL.muted, name: "Item text" });
    pill(s, 938 - pillW(st), y + 12, st, STATUS, { t: 20, fill: COL.paper });
    if (k < 4) hair(s, 519, y + 54, 419);
  });
  return s;
};

B.engagement = async (d) => {
  const s = frame(d, "Myto content");
  heading(s, d, 43, 87, 340); defList(s, d.items, 43, 205, 366);
  await addPic(s, one(d, "img"), 441, 88, 289, 174, { r: 22, pos: [76, 60], alt: "A rider beside a cairn, looking over the valley" });
  const [nt, nx] = cells(one(d, "note"));
  card(s, 441, 276, 289, 203, COL.sage, { name: "Note card" });
  T(s, nt, 462, 328, 250, 30, { font: F.disp, pt: R.title[0], lh: R.title[1], name: "Note title" });
  T(s, nx, 462, 365, 250, 70, { name: "Note text" });
  marksPhone(s); return s;
};

B.shop = async (d) => {
  const s = frame(d, "Myto content");
  heading(s, d, 43, 87, 340); defList(s, d.items, 43, 205, 346);
  await addPic(s, one(d, "img"), 462, 88, 228, 127, { r: 22, pos: [30, 50], alt: "Riding gloves, map, flask and kit laid flat" });
  d.stats.forEach((st, k) => {
    const [v, l, stt] = cells(st); const y = 231 + k * 132, h = k ? 115 : 117;
    card(s, 462, y, 228, h, [COL.sand, COL.sky][k], { name: `Stat: ${v}` });
    T(s, v, 481, y + 15, 200, 28, { font: F.mono, pt: R.data[0], lh: R.data[1], name: "Stat value" });
    pill(s, 481, y + 50, stt);
    T(s, l, 481, y + 86, 195, 34, { role: "label", color: COL.muted, name: "Stat label" });
  });
  shopPhone(s); return s;
};

B.group = async (d) => {
  const s = frame(d, "Myto content");
  const g = { ...d, sub: [] }; heading(s, g, 43, 87, 480); // the HTML omits the sub here: the caption says it
  const fills = [COL.sage, COL.sky, COL.sand];
  d.items.forEach((it, k) => {
    const [t, n, tx, st] = cells(it); const x = 43 + k * 235, y = 172;
    card(s, x, y, 221, 159, fills[k], { name: `Card: ${t}` });
    T(s, n, x + 18, y + 6, 180, 52, { font: F.disp, pt: 32, lh: 42, name: "Capacity" });
    T(s, t, x + 18, y + 61, 190, 22, { role: "body", bold: true, name: "Card title" });
    T(s, tx, x + 18, y + 85, 205, 20, { role: "label", pt: 10.8, color: COL.muted, name: "Card text" });
    pill(s, x + 18, y + 114, st);
  });
  await addPic(s, one(d, "img"), 43, 353, 287, 125, { r: 22, pos: [50, 55], alt: "A line of riders on a misty road" });
  card(s, 346, 353, 387, 125, COL.card, { name: "Group facts" });
  d.stats.forEach((st, k) => {
    const [t, tx, stt] = cells(st); const y = 353 + 7 + k * 38.5; const [g, c] = STATUS[stt];
    icon(s, g, c, 363, y + 12, 15, stt);
    T(s, t + ".", 388, y + 2, 330, 18, { role: "label", pt: 12.5, lh: 16, bold: true, name: "Fact title" });
    T(s, tx, 388, y + 19, 335, 18, { role: "caption", pt: 11.2, lh: 14, color: COL.muted, name: "Fact text" });
    if (k < 2) hair(s, 363, y + 37.5, 355);
  });
  conceptFreeShot(s, one(d, "shot")); return s;
};
async function conceptFreeShot(s, file) { s._pendingShot = file; }

B.monetisation = async (d) => {
  const s = frame(d, "Myto content");
  heading(s, d, 43, 87, 900);
  const af = [COL.sage, COL.sky, COL.sand, COL.clay, COL.card];
  ARCH.forEach(([a, b], k) => {
    const y = 173 + k * 62.4; card(s, 43, y, 261, 56, af[k], { r: 14, name: `Stream group: ${a}` });
    T(s, a, 61, y + 10, 230, 18, { role: "label", pt: 12.5, lh: 16, bold: true, name: "Group name" });
    T(s, b, 61, y + 30, 235, 16, { role: "caption", pt: 10.8, lh: 14, color: COL.muted, name: "Group text" });
  });
  card(s, 326, 173, 630, 305, COL.card, { name: "Streams" });
  d.items.forEach((it, k) => {
    const [t, w, r, sc] = cells(it); const rh = 305.2 / d.items.length; const bh = rh - 7.6; const y = 173 + 5 + k * rh;
    T(s, t, 344, y, 180, bh, { role: "label", pt: 12.5, lh: 16, bold: true, valign: "middle", name: "Stream" });
    T(s, w, 531, y, 170, bh, { role: "label", pt: 12, lh: 15.5, color: COL.muted, valign: "middle", name: "Stream detail" });
    rr(s, 705, y + bh / 2 - 3.5, 75, 7, COL.ink, { r: 3.5, t: 85, name: "Score track" }); rr(s, 705, y + bh / 2 - 3.5, 75 * (Number(sc) / 35), 7, COL.ink, { r: 3.5, name: "Score bar" });
    T(s, sc, 788, y, 30, bh, { font: F.mono, role: "label", pt: 12, lh: 15, valign: "middle", name: "Score" });
    pill(s, 938 - pillW(r), y + bh / 2 - 14, r, REC, { t: 20, fill: COL.paper });
    if (k < d.items.length - 1) hair(s, 344, y + bh + 2, 594);
  });
  return s;
};

B.partnerships = async (d) => {
  const s = frame(d, "Myto content");
  heading(s, d, 43, 87, 540);
  const half = Math.ceil(d.items.length / 2);
  [d.items.slice(0, half), d.items.slice(half)].forEach((arr, col) => {
    const x = 43 + col * 277; card(s, x, 181, 262, 297, COL.card, { name: `Rules ${col + 1}` });
    arr.forEach((it, k) => {
      const [t, tx] = cells(it); const step = 295.5 / arr.length; const y = 181 + 18 + k * step + (step - 98.5) / 2;
      icon(s, "check", "2D6A3E", x + 20, y + 3, 15, "Rule");
      T(s, t, x + 42, y, 205, 22, { role: "label", pt: 13.6, lh: 18, bold: true, name: "Rule" });
      T(s, tx, x + 42, y + 21, 195, 54, { role: "caption", pt: 11.5, lh: 15.2, color: COL.muted, name: "Rule text" });
      if (k < arr.length - 1) hair(s, x + 18, y + 78 + (step - 98.5) / 2 + 4, 226);
    });
  });
  await addPic(s, one(d, "img"), 610, 88, 346, 391, { r: 22, pos: [34, 50], alt: "Riders at a roadside stop" });
  return s;
};

B.gtm = async (d) => {
  const s = frame(d, "Myto content");
  heading(s, d, 43, 87, 540);
  d.items.forEach((it, k) => {
    const [t, tx] = cells(it); const x = 43 + (k % 2) * 267, y = 181 + Math.floor(k / 2) * 156;
    card(s, x, y, 253, 141, TINTS[k], { name: `Card: ${t}` });
    T(s, t, x + 19, y + 20, 215, 26, { role: "section", bold: true, name: "Card title" });
    T(s, tx, x + 19, y + 56, 215, 80, { name: "Card text" });
  });
  await addPic(s, one(d, "img"), 592, 88, 364, 114, { r: 22, pos: [50, 70], alt: "A rider crossing a stream" });
  card(s, 592, 217, 364, 262, COL.card, { name: "Trails list" });
  T(s, "Approved trails in the repo, not samples", 610, 235, 330, 20, { role: "label", pt: 13.6, bold: true, name: "List title" });
  d.trails.forEach((t, k) => {
    const [n, dist, km] = cells(t); const y = 264 + k * 39;
    T(s, n, 610, y, 250, 18, { role: "label", pt: 12.5, lh: 16, bold: true, name: "Trail" });
    T(s, dist, 610, y + 17, 250, 14, { role: "caption", pt: 10.2, lh: 13, color: COL.muted, name: "Region" });
    T(s, km, 840, y + 6, 98, 20, { font: F.mono, pt: 12, lh: 16, align: "right", color: COL.muted, name: "Distance" });
    if (k < 3) hair(s, 610, y + 37, 328);
  });
  T(s, TRAILS_NOTE, 610, 424, 330, 40, { role: "caption", pt: 10.5, lh: 14.5, color: COL.muted, name: "List note" });
  return s;
};

B.roadmap = async (d) => {
  const s = frame(d, "Myto content");
  heading(s, d, 43, 87, 600);
  const keyStr = "Built+In build+Planned+Hypothesis"; pills(s, 945 - pillsWidth(keyStr) - 20, 91, keyStr, STATUS, { t: 100 });
  d.phases.forEach((p, k) => {
    const [name, dt, th, gate] = cells(p); const x = 43 + (k % 2) * 463, y = 173 + Math.floor(k / 2) * 161, w = k % 2 ? 450 : 452, h = 149;
    card(s, x, y, w, h, TINTS[k], { name: `Phase: ${name}` });
    const nn = wrapCount(name, 128, R.section[0] - 1, 0.5);
    T(s, name, x + 18, y + 20, 130, hOf(nn, 26), { font: F.text, pt: 16.5, lh: 25, bold: true, name: "Phase" });
    const dy = y + 20 + hOf(nn, 26) + 2; T(s, dt, x + 18, dy, 150, 16, { font: F.mono, pt: 10.5, lh: 14, color: COL.muted, name: "Dates" });
    T(s, th, x + 18, dy + 22, 140, 40, { role: "label", pt: 12.5, lh: 17, name: "Objective" });
    const items = d.items.filter((i) => cells(i)[0] === String(k + 1)); let iy = y + 14;
    items.forEach((i) => {
      const [, t, pr, st] = cells(i); const stw = st.split("+")[0]; const [g, c] = STATUS[stw]; const n = wrapCount(t, 195, 12.5);
      icon(s, g, c, x + 174, iy + 3, 14, stw);
      T(s, t, x + 194, iy, 205, hOf(n, 16), { role: "label", pt: 12.5, lh: 16, name: "Deliverable" });
      T(s, pr, x + 414, iy, 24, 16, { font: F.mono, pt: 10, lh: 14, color: COL.muted, align: "right", name: "Priority" });
      iy += hOf(n, 16) + 5;
    });
    const dv = Math.max(y + 99, iy + 3); hair(s, x + 174, dv, 264);
    T(s, [{ text: "Gate ", options: { bold: true, color: COL.ink } }, { text: gate, options: { color: COL.muted } }], x + 174, dv + 8, 264, 34, { role: "caption", pt: 10.6, lh: 14, name: "Gate" });
  });
  return s;
};

B.financials = async (d) => {
  const s = frame(d, "Myto content");
  heading(s, d, 43, 87, 900);
  const ks = ["conservative", "base", "ambitious"]; const Ls = ks.map((k) => model.scenarios[k].label); const lk = (n) => n / 1e5;
  card(s, 43, 181, 435, 141, COL.card, { name: "Chart card: year one" });
  T(s, "Year one: revenue, opex, net", 61, 195, 250, 20, { role: "label", pt: 13.6, bold: true, name: "Chart title" });
  s.addChart(pres.charts.BAR, [
    { name: "Revenue", labels: Ls, values: ks.map((k) => lk(model.scenarios[k].year.revenue)) },
    { name: "Opex", labels: Ls, values: ks.map((k) => lk(model.scenarios[k].year.opex)) },
    { name: "Net", labels: Ls, values: ks.map((k) => lk(model.scenarios[k].year.net)) },
  ], {
    x: u(51), y: u(214), w: u(419), h: u(104), barDir: "col", barGrouping: "clustered", barGapWidthPct: 40, chartColors: ["1F4A6B", HEX.barGrey, HEX.record], invertedColors: ["1F4A6B", HEX.barGrey, HEX.record],
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: '"₹"0.00" L";-"₹"0.00" L"', dataLabelFontSize: 7, dataLabelFontFace: F.mono, dataLabelColor: "1A1A1A",
    catAxisLabelFontSize: 9, catAxisLabelFontFace: F.text, catAxisLabelColor: "58524D", valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" }, catAxisLabelPos: "low",
    showLegend: true, legendPos: "t", legendFontSize: 8, legendFontFace: F.text, legendColor: "58524D", showTitle: false,
  });
  card(s, 43, 337, 435, 141, COL.card, { name: "Chart card: cumulative net" });
  T(s, "Cumulative net by month", 61, 351, 250, 20, { role: "label", pt: 13.6, bold: true, name: "Chart title" });
  const cum = ks.map((k) => { let a = 0; return model.scenarios[k].rows.map((r) => lk((a += r.net))); });
  s.addChart(pres.charts.LINE, ks.map((k, i) => ({ name: Ls[i], labels: MONTHS, values: cum[i] })), {
    x: u(51), y: u(368), w: u(419), h: u(106), chartColors: ["6B6560", "1F4A6B", HEX.record], lineSize: 2.25, lineDataSymbol: "none", showTitle: false,
    valAxisLabelFormatCode: '"₹"0.0" L"', valAxisLabelFontSize: 8, valAxisLabelFontFace: F.mono, valAxisLabelColor: "6B6560", catAxisLabelFontSize: 8, catAxisLabelFontFace: F.mono, catAxisLabelColor: "6B6560",
    valGridLine: { color: "E3DFDA", size: 0.5 }, catGridLine: { style: "none" }, catAxisLabelPos: "low", showLegend: true, legendPos: "r", legendFontSize: 8, legendFontFace: F.text, legendColor: "58524D",
  });
  card(s, 565, 181, 391, 297, COL.card, { name: "Scenario table card" });
  const b = (t, o = {}) => ({ text: t, options: o });
  const mono = (t, base) => ({ text: t, options: { fontFace: F.mono, fontSize: 10, align: "right", valign: "middle", color: base ? "1F4A6B" : "1A1A1A" } });
  const head = ["", "Conserv.", "Base", "Ambit."].map((t) => ({ text: t, options: { fontFace: F.mono, fontSize: 8.5, align: "right", color: "6B6560", valign: "bottom" } }));
  const rows = [head, ...d.stats.map((st) => {
    const [v, l] = cells(st); const [a, bb] = l.split(": "); const vs = v.split(" / ");
    return [{ text: [b(a, { bold: true, fontSize: 9.5, fontFace: F.text, color: "1A1A1A", breakLine: true }), b(bb || "", { fontSize: 8.5, fontFace: F.text, color: "6B6560" })], options: { valign: "middle" } }, ...vs.map((x, i) => mono(x, i === 1))];
  })];
  const rule = [{ type: "none" }, { type: "none" }, { pt: 0.5, color: "DEDAD5" }, { type: "none" }];
  s.addTable(rows.map((r) => r.map((c) => ({ ...c, options: { ...c.options, border: rule, margin: [0, 4, 0, 4] } }))), {
    x: u(583), y: u(190), w: u(355), colW: [u(145), u(70), u(70), u(70)], rowH: [u(24), ...Array(d.stats.length).fill(u(Math.min(31.5, 252 / d.stats.length)))], autoPage: false, objectName: "Scenario table",
  });
  return s;
};

B.competitive = async (d) => {
  const s = frame(d, "Myto content");
  heading(s, d, 43, 87, 560);
  card(s, 43, 211, 913, 267, COL.card, { name: "Competitive table" });
  const cx = [66, 295, 524, 775], cw = [222, 220, 235, 165];
  ["Capability", "Myto today", "Riding Verse, per the note", "Evidence grade"].forEach((h, i) => T(s, h, cx[i], 223, cw[i], 16, { role: "caption", pt: 10.5, color: COL.muted, name: "Column head" }));
  hair(s, 66, 246, 868);
  d.items.forEach((it, k) => {
    const [c, st, o, e] = cells(it); const rh = 232.8 / d.items.length; const y = 247 + k * rh;
    T(s, c, cx[0], y, cw[0], rh - 0.8, { role: "label", pt: 12.2, lh: 15.5, bold: false, color: COL.ink, valign: "middle", name: "Capability" });
    pills(s, cx[1], y + (rh - 28) / 2, st, STATUS, { t: 20, fill: COL.paper });
    T(s, o, cx[2], y, cw[2], rh - 0.8, { role: "label", pt: 12, lh: 15.5, valign: "middle", name: "Competitor" });
    T(s, e, cx[3], y, cw[3], rh - 0.8, { role: "caption", pt: 10.2, lh: 13.5, color: COL.muted, valign: "middle", name: "Evidence" });
    if (k < d.items.length - 1) hair(s, 66, y + rh, 868);
  });
  return s;
};

B.landscape = async (d) => {
  const s = frame(d, "Myto content");
  heading(s, d, 43, 87, 560);
  card(s, 43, 211, 913, 267, COL.card, { name: "Landscape table" });
  const cx = [66, 230, 510], cw = [150, 265, 425];
  ["App", "What the listing shows", "Where we stand"].forEach((h, i) => T(s, h, cx[i], 221, cw[i], 16, { role: "caption", pt: 10.5, color: COL.muted, name: "Column head" }));
  hair(s, 66, 241, 868);
  d.items.forEach((it, k) => {
    const step = 235 / d.items.length; const [a, kind, o, w] = cells(it); const y = 242 + k * step;
    T(s, [{ text: a, options: { bold: true, breakLine: true, fontSize: 12.2, color: COL.ink } }, { text: kind, options: { fontSize: 10, color: COL.muted } }], cx[0], y, cw[0], step - 1, { role: "label", pt: 12.2, lh: 14.5, valign: "middle", name: "App" });
    T(s, o, cx[1], y, cw[1], step - 1, { role: "caption", pt: 10, lh: 12.4, color: COL.muted, valign: "middle", name: "Listing" });
    T(s, w, cx[2], y, cw[2], step - 1, { role: "label", pt: 10.8, lh: 13.6, valign: "middle", name: "Where we stand" });
    if (k < d.items.length - 1) hair(s, 66, y + step, 868);
  });
  return s;
};

// pitch only: founder-story chapter (see build.mjs L.story). Art left 680/1920 of the width.
B.story = async (d) => {
  const s = frame(d, "Myto content, art on the left", { logoX: 398, right: 956, noteX: 474, noteW: 482 });
  const pos = (one(d, "imgpos") || "30% 50%").split(" ").map((v) => parseFloat(v));
  await addPic(s, one(d, "img"), 0, 0, 354, 563, { pos, alt: "Story illustration", name: "Side art" });
  const ch = one(d, "chapter"); const cw = 30 + 6.6 * ch.length;
  rr(s, 398, 92, cw, 26, "E3EBF1", { r: 13, name: "Chapter" });
  T(s, ch, 398, 92, cw, 26, { role: "label", color: COL.accent, align: "center", valign: "middle", wrap: false, name: "Chapter text" });
  const n = wrapCount(one(d, "headline"), 520, R.display[0], 0.62);
  T(s, one(d, "headline"), 398, 132, 540, hOf(n, R.display[1]), { font: F.disp, pt: R.display[0], lh: R.display[1], name: "Title" });
  const sy = 132 + hOf(n, R.display[1]) + 6;
  T(s, one(d, "sub"), 398, sy, 550, 44, { color: COL.muted, name: "Subtitle" });
  const fills = [COL.sand, COL.clay, COL.sky]; const cy = sy + 62, ch2 = 470 - cy;
  d.items.forEach((it, k) => {
    const [t, tx] = cells(it); const x = 398 + k * 189, w = 179;
    card(s, x, cy, w, ch2, fills[k], { name: `Card: ${t}` });
    T(s, String(k + 1), x + 16, cy + 12, 40, 26, { font: F.disp, pt: 17, lh: 22, color: COL.accent, name: "Number" });
    T(s, t, x + 16, cy + 44, w - 28, 40, { role: "body", bold: true, name: "Card title" });
    T(s, tx, x + 16, cy + 92, w - 28, ch2 - 100, { role: "label", color: COL.muted, valign: "top", name: "Card text" });
  });
  return s;
};
B["vision-long"] = async (d) => {
  const s = frame(d, "Myto content", { right: 518, noteX: 120, noteW: 410 });
  await addPic(s, one(d, "img"), 573, 0, 427, 563, { pos: one(d, "imgpos") ? one(d, "imgpos").split(" ").map(parseFloat) : [86, 50], alt: "Vision illustration", name: "Side art" });
  const head = one(d, "headline").split(". ").map((x, i, a) => (i < a.length - 1 ? x + "." : x));
  T(s, head.join("\n"), 43, 105, 500, 150, { font: F.disp, pt: R.display[0], lh: 44.6, name: "Title" });
  T(s, one(d, "sub"), 43, 253, 480, 22, { color: COL.muted, name: "Subtitle" });
  card(s, 43, 304, 486, 175, COL.card, { name: "Years" });
  d.items.forEach((it, k) => {
    const [t, tx] = cells(it); const y = 304 + 8 + k * 57.7;
    T(s, t, 61, y + 10, 100, 22, { role: "label", pt: 13.6, bold: true, name: "Period" });
    T(s, tx, 167, y + 10, 345, 40, { role: "label", pt: 12.2, lh: 17.5, color: COL.muted, name: "Plan" });
    if (k < 2) hair(s, 61, y + 57, 450);
  });
  return s;
};


// pitch deck only: product slide with the demo slot (poster and play button; see build.mjs L.demo)
B.demo = async (d) => {
  const s = frame(d, "Myto content");
  heading(s, d, 43, 87, 600);
  const fills = [COL.sky, COL.sage, COL.sand]; const h = 89;
  d.items.forEach((it, k) => {
    const [t, tx] = cells(it); const y = 181 + k * (h + 15);
    card(s, 43, y, 650, h, fills[k], { name: `Card: ${t}` });
    s.addShape(pres.shapes.OVAL, { x: u(66), y: u(y + 28), w: u(32), h: u(32), fill: { color: COL.card }, line: { type: "none" }, objectName: `Number ${k + 1}` });
    T(s, String(k + 1), 66, y + 28, 32, 32, { font: F.disp, pt: 10, lh: 13, align: "center", valign: "middle", name: "Number" });
    T(s, t, 118, y + 21, 540, 24, { role: "section", bold: true, name: "Card title" });
    T(s, tx, 118, y + 47, 540, 22, { role: "label", color: COL.muted, name: "Card text" });
  });
  rr(s, 763, 90, 193, 388, COL.card, { r: 30, shadow: true, name: "Phone frame" });
  await addPic(s, one(d, "shot"), 769, 96, 181, 376, { shot: true, r: 24, pos: [50, 0], alt: "Home screen of the app from the test build", name: "Demo poster" });
  s.addShape(pres.shapes.OVAL, { x: u(833), y: u(262), w: u(52), h: u(52), fill: { color: COL.ink }, line: { type: "none" }, shadow: { type: "outer", color: HEX.hair, opacity: 0.25, blur: 8, offset: 2, angle: 90 }, objectName: "Play button" });
  s.addShape(pres.shapes.ISOSCELES_TRIANGLE, { x: u(851), y: u(279), w: u(18), h: u(16), rotate: 90, fill: { color: COL.card }, line: { type: "none" }, objectName: "Play glyph" });
  return s;
};

// pitch deck only: the raise (see build.mjs L.ask)
B.ask = async (d) => {
  const s = frame(d, "Myto content");
  heading(s, d, 43, 87, 540);
  const fills = [COL.sky, COL.sage, COL.sand, COL.clay];
  d.items.forEach((it, k) => {
    const [t, tx, g] = cells(it); const x = 43 + (k % 2) * 267, y = 181 + Math.floor(k / 2) * 156;
    card(s, x, y, 253, 141, fills[k], { name: `Card: ${t}` });
    T(s, t, x + 19, y + 18, 215, 26, { role: "section", bold: true, name: "Card title" });
    T(s, tx, x + 19, y + 50, 215, 46, { role: "label", color: COL.muted, name: "Card text" });
    T(s, g, x + 19, y + 104, 215, 28, { role: "label", pt: 12, lh: 15.5, bold: true, name: "Gate" });
  });
  await addPic(s, one(d, "img"), 592, 88, 364, 114, { r: 22, pos: [50, 70], alt: "Two motorcycles and a tent on a ridge at dusk" });
  card(s, 592, 217, 364, 262, COL.card, { name: "The raise" });
  const [v, l, st] = cells(one(d, "raise"));
  T(s, "Raising", 614, 237, 300, 22, { role: "body", bold: true, name: "Card title" });
  T(s, v, 614, 272, 320, 38, { font: F.disp, pt: R.hero[0], lh: R.hero[1], name: "Raise" });
  T(s, l, 614, 318, 320, 22, { role: "label", color: COL.muted, name: "Raise label" });
  pills(s, 614, 352, st);
  T(s, one(d, "note"), 614, 398, 320, 40, { role: "label", color: COL.muted, name: "Tagline" });
  return s;
};

// ---------- build ----------
async function post(buf) { // write the theme palette, repair the chart axis element PowerPoint rejects, drop folder entries
  const zip = await JSZip.loadAsync(buf);
  const slots = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];
  const scheme = `<a:clrScheme name="${THEME.name}">` + slots.map((k) => `<a:${k}><a:srgbClr val="${THEME.colors[k]}"/></a:${k}>`).join("") + "</a:clrScheme>";
  const part = "ppt/theme/theme1.xml";
  zip.file(part, (await zip.file(part).async("string")).replace(/<a:clrScheme\b[\s\S]*?<\/a:clrScheme>/, () => scheme).replace(/(<a:(?:theme|fontScheme)\b[^>]*?\bname=")[^"]*"/g, (_, h) => `${h}${THEME.name}"`));
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir) { delete zip.files[name]; continue; }
    if (!name.endsWith(".xml")) continue;
    const xml = await zip.file(name).async("string");
    if (xml.includes('<c:crossesAt val="autoZero"/>')) zip.file(name, xml.replaceAll('<c:crossesAt val="autoZero"/>', '<c:crosses val="autoZero"/>'));
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

await prepIcons(); await prepLogo(); defineLayouts(await bgImage());
const seen = new Set();
for (const d of slides) {
  if (!B[d.layout]) throw new Error(`No PowerPoint builder for layout "${d.layout}" (slide ${d.n})`);
  if (!seen.has(SECTION_OF(d.n))) { pres.addSection({ title: SECTION_OF(d.n) }); seen.add(SECTION_OF(d.n)); }
  const s = await B[d.layout](d);
  if (s._pendingShot) { // group slide: real app frame in a phone
    rr(s, 763, 90, 193, 388, COL.card, { r: 30, shadow: true, name: "Phone frame" });
    await addPic(s, s._pendingShot, 769, 96, 181, 376, { shot: true, r: 24, pos: [50, 0], alt: "Group ride screen from the test build", name: "Screenshot: group ride" });
  }
}
mkdirSync(join(here, "exports"), { recursive: true });
const raw = await pres.write({ outputType: "nodebuffer" });
writeFileSync(OUT, await post(raw));
console.log(`${OUT} written: ${slides.length} slides`);
