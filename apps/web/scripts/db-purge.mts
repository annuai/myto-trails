// Shows what the nightly retention purge would remove from DATABASE_URL, without removing anything (everything is rolled back).
// Run: npm run db:purge:dry -w @moto-trails/web
import { createSql } from "../src/server/db/client";
import { purgeRetention } from "../src/server/retention/purge";
import { MemoryStorageProvider } from "../src/server/storage/memory-provider";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = createSql(url);
try {
  console.log(JSON.stringify(await purgeRetention(sql, new MemoryStorageProvider(), new Date(), { dryRun: true }), null, 2));
} catch (e) {
  console.error(`dry run failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
