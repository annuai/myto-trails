// Fails if any hex colour literal appears in app source (colours belong in packages/tokens).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { findHardcodedColors } from "./find-hardcoded-colors.ts";

const root = new URL("..", import.meta.url).pathname;
const exts = [".ts", ".tsx", ".css"];
const offenders = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (exts.some((e) => name.endsWith(e)) && !/\.test\.[tj]sx?$/.test(name)) {
      const found = findHardcodedColors(readFileSync(path, "utf8"));
      if (found.length) offenders.push(`${relative(root, path)}: ${found.join(", ")}`);
    }
  }
}

try {
  walk(join(root, "apps"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}

if (offenders.length) {
  console.error("Hard-coded colours found (use tokens):\n" + offenders.join("\n"));
  process.exit(1);
}
console.log("check:colors OK");
