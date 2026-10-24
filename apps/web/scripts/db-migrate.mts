// Applies db/migrations to DATABASE_URL. Run: npm run db:migrate -w @moto-trails/web
import { fileURLToPath } from "node:url";
import { createSql } from "../src/server/db/client";
import { migrate } from "../src/server/db/migrate";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = createSql(url);
try {
  const { applied } = await migrate(sql, fileURLToPath(new URL("../db/migrations", import.meta.url)));
  console.log(applied.length ? `applied: ${applied.join(", ")}` : "no new migrations");
} catch (e) {
  console.error(`migration failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
