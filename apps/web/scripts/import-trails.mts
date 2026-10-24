// Imports trails from a JSON file (an array of records). Run: npm run db:import -w @moto-trails/web -- data/sample-trails.json
import { readFileSync } from "node:fs";
import { createSql } from "../src/server/db/client";
import { ImportError, importTrail } from "../src/server/import/import-trail";

const args = process.argv.slice(2);
const allowSamples = args.includes("--allow-samples");
const file = args.find((a) => !a.startsWith("--"));
const url = process.env.DATABASE_URL;
if (!file || !url) {
  console.error("usage: DATABASE_URL=... npm run db:import -w @moto-trails/web -- <file.json> [--allow-samples]");
  process.exit(1);
}

const records = JSON.parse(readFileSync(file, "utf8")) as unknown[];
const sql = createSql(url);
const production = process.env.NODE_ENV === "production";
let failed = false;
try {
  for (const record of Array.isArray(records) ? records : [records]) {
    const label = (record as { slug?: string; name?: string })?.slug ?? (record as { name?: string })?.name ?? "(unnamed)";
    try {
      const { slug } = await importTrail(sql, record, { production, allowSamples });
      console.log(`${slug}: imported`);
    } catch (e) {
      if (e instanceof ImportError && e.code === "exists") {
        console.log(`${label}: already exists`);
      } else {
        failed = true;
        console.error(`${label}: FAILED ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
} finally {
  await sql.end({ timeout: 5 });
}
process.exitCode = failed ? 1 : 0;
