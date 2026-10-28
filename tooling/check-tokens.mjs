// Style values (sizes, spacing, radii, opacities, rgba) in the phone app must come from the design tokens.
// Existing offenders are recorded in tokens-baseline.json; a file may get better but never worse, so new code starts clean
// and old screens are migrated one at a time. `npm run check:tokens -- --update` lowers the baseline after a clean-up.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { findHardcodedSizes } from "./find-hardcoded-sizes.ts";

const root = new URL("..", import.meta.url).pathname;
const baselinePath = new URL("./tokens-baseline.json", import.meta.url).pathname;
const update = process.argv.includes("--update");
const roots = ["apps/mobile/app", "apps/mobile/src"];
const exempt = (path) => /[\\/]theme[\\/]/.test(path) || /\.tokens\.tsx?$/.test(path) || /\.test\.[tj]sx?$/.test(path);

const found = {};
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.tsx?$/.test(name) && !exempt(path)) {
      const hits = findHardcodedSizes(readFileSync(path, "utf8"));
      if (hits.length) found[relative(root, path)] = hits;
    }
  }
}
for (const r of roots) walk(join(root, r));

const counts = Object.fromEntries(Object.entries(found).map(([f, h]) => [f, h.length]));
if (update) {
  writeFileSync(baselinePath, JSON.stringify(Object.fromEntries(Object.entries(counts).sort()), null, 2) + "\n");
  console.log(`check:tokens baseline written (${Object.keys(counts).length} files, ${Object.values(counts).reduce((a, b) => a + b, 0)} values)`);
  process.exit(0);
}

let baseline = {};
try { baseline = JSON.parse(readFileSync(baselinePath, "utf8")); } catch { /* no baseline yet: every offender counts */ }
const worse = Object.keys(counts).filter((f) => counts[f] > (baseline[f] ?? 0));
if (worse.length) {
  console.error("Hard-coded style values found (use tokens from src/theme/tokens.ts or a *.tokens.ts file):");
  for (const f of worse) console.error(`  ${f}: ${counts[f]} (allowed ${baseline[f] ?? 0}): ${found[f].slice(0, 6).join(", ")}`);
  process.exit(1);
}
const better = Object.keys(baseline).filter((f) => (counts[f] ?? 0) < baseline[f]);
console.log(`check:tokens OK${better.length ? ` (${better.length} files improved; run npm run check:tokens -- --update to lock it in)` : ""}`);
