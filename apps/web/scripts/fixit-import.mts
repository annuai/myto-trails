// Loads the first version of the Fix it content (packages/domain/src/fixitContent.ts) into the database. Without --overwrite it only adds
// what is missing and never touches a row that is already there. After the first load the database is the source of truth: edit it there.
// Run: npm run fixit:import -w @moto-trails/web [-- --dry-run] [-- --overwrite]
import { FIXIT_CHECKS, FIXIT_GUIDES, FIXIT_TOOLS } from "@moto-trails/domain";
import { createSql } from "../src/server/db/client";
import { importFixit } from "../src/server/fixit/fixit";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const overwrite = args.includes("--overwrite");
const url = process.env.DATABASE_URL;
if (!dryRun && !url) throw new Error("DATABASE_URL is not set (apps/web/.env.local)");
const sql = createSql(url ?? "postgres://unused");
try {
  const r = await importFixit(sql, { tools: FIXIT_TOOLS, checks: FIXIT_CHECKS, guides: FIXIT_GUIDES }, { overwrite, dryRun });
  if (r.problems.length) { for (const p of r.problems) console.error(p); process.exitCode = 1; }
  else console.log(`${dryRun ? "would load" : "loaded"} ${r.guides} guides, ${r.steps} steps, ${r.tools} tools, ${r.checks} check items and ${r.art} picture slots${overwrite ? " (overwriting)" : ""}`);
} finally {
  await sql.end({ timeout: 5 });
}
