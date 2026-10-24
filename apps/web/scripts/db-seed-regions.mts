// Seeds India and its states/UTs. Run: npm run db:seed:regions -w @moto-trails/web
import { createSql } from "../src/server/db/client";
import { seedRegions } from "../src/server/db/seed-regions";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = createSql(url);
try {
  const { inserted } = await seedRegions(sql);
  console.log(`inserted ${inserted} regions`);
} catch (e) {
  console.error(`seed failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
