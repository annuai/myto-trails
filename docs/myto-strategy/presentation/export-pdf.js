#!/usr/bin/env node
// Exports index.html to exports/myto-strategy-deck.pdf: one 1920x1080 (16:9) page per slide, no margins.
// Needs Playwright. Looks for it as a normal import, then in the npx cache. Uses system Google Chrome if present,
// otherwise Playwright's Chromium (install once with: npx playwright install chromium).
// Usage: node export-pdf.js [outfile]      (or `npm run deck:pdf` from the repo root)
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

function loadPlaywright() {
  try { return require("playwright"); } catch {}
  const root = path.join(os.homedir(), ".npm", "_npx");
  if (fs.existsSync(root)) {
    for (const d of fs.readdirSync(root)) {
      const p = path.join(root, d, "node_modules", "playwright");
      if (fs.existsSync(p)) return require(p);
    }
  }
  console.error("Playwright not found. Run: npx -y playwright --version   (this caches it), or npm i -D playwright");
  process.exit(1);
}

(async () => {
  const { chromium } = loadPlaywright();
  const here = __dirname;
  const pitch = process.env.DECK === "pitch";
  const out = process.argv[2] || path.join(here, "exports", pitch ? "myto-pitch-deck.pdf" : "myto-strategy-deck.pdf");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  let browser;
  try { browser = await chromium.launch({ channel: "chrome" }); }
  catch { browser = await chromium.launch(); }
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const failed = [];
  page.on("requestfailed", (r) => failed.push(r.url()));
  page.on("response", (r) => { if (r.status() >= 400) failed.push(r.url()); });
  await page.goto("file://" + path.join(here, pitch ? "index-pitch.html" : "index.html") + "?print=1", { waitUntil: "load" });
  await page.waitForSelector("body[data-ready='1']");
  await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))));
  await page.pdf({ path: out, width: "1920px", height: "1080px", printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await browser.close();
  if (failed.length) { console.error("Failed resources:\n" + failed.join("\n")); process.exit(2); }
  console.log("wrote " + out);
})();
