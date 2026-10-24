// Seeds the built-in gazetteer. Run: npm run db:seed:places -w @moto-trails/web (after db:seed:regions)
import { readFileSync } from "node:fs";
import { createSql } from "../src/server/db/client";
import { seedPlaces, type PlaceSeed } from "../src/server/db/seed-places";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const places = JSON.parse(readFileSync(new URL("../data/places.json", import.meta.url), "utf8")) as PlaceSeed[];
const sql = createSql(url);
try {
  const { inserted } = await seedPlaces(sql, places);
  console.log(`inserted ${inserted} places`);
} catch (e) {
  console.error(`seed failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
