// Loads data/boundaries/countries.geojson into country_boundary, and adds every country it lists that has no region row yet
// as "coming soon" (enabled = false). Opening a country is a separate, deliberate step: enable it in the database.
// Run: npm run db:seed:boundaries -w @moto-trails/web
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { slugify } from "@moto-trails/domain";
import { createSql } from "../src/server/db/client";
import { loadBoundaries, type BoundaryFeature } from "../src/server/db/boundaries";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const file = fileURLToPath(new URL("../data/boundaries/countries.geojson", import.meta.url));
const collection = JSON.parse(readFileSync(file, "utf8")) as { features: { properties: { iso2: string; name: string }; geometry: BoundaryFeature["geometry"] }[] };
const sql = createSql(url);
try {
  let added = 0;
  const display = new Intl.DisplayNames(["en"], { type: "region" });
  for (const f of collection.features) {
    const { iso2 } = f.properties;
    // Natural Earth's short names ("Dem. Rep. Korea") are for maps; people expect the usual English name.
    const name = display.of(iso2) && display.of(iso2) !== iso2 ? display.of(iso2)! : f.properties.name;
    const slug = slugify(name) || iso2.toLowerCase();
    const rows = await sql`
      insert into region (kind, name, slug, iso2, enabled)
      select 'country', ${name}, ${slug}, ${iso2}, false
      where not exists (select 1 from region where kind = 'country' and iso2 = ${iso2})
      on conflict do nothing returning id`;
    if (rows.length === 0) {
      // A slug clash with another country: fall back to the ISO code, which is unique.
      const again = await sql`
        insert into region (kind, name, slug, iso2, enabled)
        select 'country', ${name}, ${iso2.toLowerCase()}, ${iso2}, false
        where not exists (select 1 from region where kind = 'country' and iso2 = ${iso2})
        on conflict do nothing returning id`;
      added += again.length;
    } else added += rows.length;
  }
  console.log(`added ${added} coming-soon countries`);
  // Names and slugs of countries that are still coming soon follow the usual English names (no page depends on them yet).
  for (const f of collection.features) {
    const { iso2 } = f.properties;
    const name = display.of(iso2);
    if (!name || name === iso2) continue;
    const slug = slugify(name) || iso2.toLowerCase();
    const taken = await sql`select 1 from region where kind = 'country' and slug = ${slug} and iso2 <> ${iso2}`;
    await sql`update region set name = ${name}, slug = ${taken.length ? iso2.toLowerCase() : slug} where kind = 'country' and iso2 = ${iso2} and not enabled`;
  }
  const { loaded } = await loadBoundaries(sql, collection.features.map((f) => ({ iso2: f.properties.iso2, geometry: f.geometry })));
  console.log(`loaded outlines for ${loaded} countries`);
} finally {
  await sql.end({ timeout: 5 });
}
