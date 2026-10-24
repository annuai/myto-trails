import { slugify } from "@moto-trails/domain";
import type { Sql } from "postgres";

/** Returns the district under the given state, creating it if needed. */
export async function ensureDistrict(sql: Sql, stateSlug: string, districtName: string): Promise<{ id: string; slug: string }> {
  const slug = slugify(districtName);
  if (!slug) throw new Error("Invalid district name: it cannot form a slug");
  const [state] = await sql`select id from region where kind = 'state' and slug = ${stateSlug}`;
  if (!state) throw new Error(`Unknown state: ${stateSlug}`);
  const [row] = await sql`
    insert into region (kind, name, slug, parent_id) values ('district', ${districtName.trim()}, ${slug}, ${state.id})
    on conflict (parent_id, slug) do update set slug = excluded.slug
    returning id, slug`;
  return { id: row!.id as string, slug: row!.slug as string };
}
