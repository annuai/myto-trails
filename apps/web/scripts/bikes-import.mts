// Adds or updates bike makes and models from a CSV (slug, make, model, category, engine_cc, year_from, year_to), matched by slug.
// Safe to re-run; never touches a model's image, sort or active flag. Run: npm run bikes:import -w @moto-trails/web -- data/bikes/catalogue.csv [--dry-run]
import { readFileSync } from "node:fs";
import { createSql } from "../src/server/db/client";
import { makeSlug, parseCatalogue } from "../src/server/community/bike-catalogue";

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const file = args.find((a) => !a.startsWith("--"));
if (!file) throw new Error("usage: bikes-import.mts <catalogue.csv> [--dry-run]");

const rows = parseCatalogue(readFileSync(file, "utf8"));
const makes = new Map<string, string>();
for (const r of rows) makes.set(makeSlug(r.make), r.make);
if (dry) {
  console.log(`would import ${rows.length} models across ${makes.size} makes from ${file}`);
  process.exit(0);
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (apps/web/.env.local)");
const sql = createSql(url);
try {
  await sql.begin(async (tx) => {
    const ids = new Map<string, string>();
    for (const [slug, name] of makes) {
      const [m] = await tx`insert into bike_make (slug, name) values (${slug}, ${name}) on conflict (slug) do update set name = excluded.name returning id`;
      ids.set(slug, m!.id);
    }
    for (const r of rows) {
      await tx`
        insert into bike_model (slug, make_id, model, category, engine_cc, year_from, year_to)
        values (${r.slug}, ${ids.get(makeSlug(r.make))!}, ${r.model}, ${r.category}, ${r.engineCc}, ${r.yearFrom}, ${r.yearTo})
        on conflict (slug) do update set make_id = excluded.make_id, model = excluded.model, category = excluded.category,
          engine_cc = excluded.engine_cc, year_from = excluded.year_from, year_to = excluded.year_to`;
    }
  });
  const [c] = await sql`select (select count(*) from bike_make)::int as makes, (select count(*) from bike_model)::int as models`;
  console.log(`imported ${rows.length} models across ${makes.size} makes; the catalogue now has ${c!.models} models, ${c!.makes} makes`);
} finally {
  await sql.end({ timeout: 5 });
}
