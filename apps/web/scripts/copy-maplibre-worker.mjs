// MapLibre GL 6 runs its code in a module web worker that bundlers do not wire up for us, so the worker and its
// shared chunk are served as static files. Run before dev and build (see package.json).
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const dist = join(dirname(require.resolve("maplibre-gl/package.json")), "dist");
const target = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "vendor", "maplibre");
mkdirSync(target, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(join(dist, file), join(target, file));
console.log("maplibre worker files copied to public/vendor/maplibre");
