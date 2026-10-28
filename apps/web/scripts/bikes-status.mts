// Lists the bike models that still have no picture, grouped by make: the to-do list for the image work.
// Run: npm run bikes:status -w @moto-trails/web
import { createSql } from "../src/server/db/client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (apps/web/.env.local)");
const sql = createSql(url);
try {
  const rows = await sql`
    select mk.name as make, m.slug, m.model, (m.image_variants <> '{}'::jsonb) as has_image
    from bike_model m join bike_make mk on mk.id = m.make_id where m.active order by mk.name, m.model`;
  const missing = new Map<string, string[]>();
  for (const r of rows) if (!r.has_image) missing.set(r.make, [...(missing.get(r.make) ?? []), r.slug]);
  for (const [make, slugs] of missing) {
    console.log(`${make} (${slugs.length})`);
    for (const s of slugs) console.log(`  ${s}`);
  }
  const without = [...missing.values()].reduce((n, s) => n + s.length, 0);
  console.log(`\n${rows.length - without} of ${rows.length} models have a picture; ${without} to go`);
} finally {
  await sql.end({ timeout: 5 });
}
