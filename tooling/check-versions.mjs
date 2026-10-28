// Every package and the phone app carry one product version, recorded in .release-please-manifest.json.
// The release bot (see docs/versioning.md) bumps them together; this stops a hand edit from letting one drift.
import { readFileSync } from "node:fs";
import { findVersionDrift } from "./find-version-drift.ts";

const root = new URL("..", import.meta.url).pathname;
const read = (path) => JSON.parse(readFileSync(root + path, "utf8"));
const manifest = read(".release-please-manifest.json")["."];

const files = [
  ["package.json", (j) => j.version],
  ["apps/web/package.json", (j) => j.version],
  ["apps/mobile/package.json", (j) => j.version],
  ["apps/mobile/app.json", (j) => j.expo?.version],
  ["packages/domain/package.json", (j) => j.version],
  ["packages/tokens/package.json", (j) => j.version],
  ["tooling/package.json", (j) => j.version],
].map(([path, pick]) => ({ path, version: pick(read(path)) }));

const drift = findVersionDrift(manifest, files);
if (drift.length) {
  console.error(`Version drift (manifest says ${manifest}):\n${drift.map((d) => `  ${d}`).join("\n")}`);
  process.exit(1);
}
console.log(`All ${files.length} versions match the manifest: ${manifest}`);
