import { INDIA_STATES } from "@moto-trails/domain";
import type { Sql } from "postgres";

/** Idempotently inserts India and its 28 states and 8 union territories. Districts are created on demand. */
export async function seedRegions(sql: Sql): Promise<{ inserted: number }> {
  return sql.begin(async (tx) => {
    let inserted = 0;
    const country = await tx`
      insert into region (kind, name, slug) values ('country', 'India', 'india')
      on conflict do nothing returning id`;
    inserted += country.length;
    const [india] = await tx`select id from region where slug = 'india' and parent_id is null`;
    for (const s of INDIA_STATES) {
      const rows = await tx`
        insert into region (kind, name, slug, parent_id) values ('state', ${s.name}, ${s.slug}, ${india!.id})
        on conflict do nothing returning id`;
      inserted += rows.length;
    }
    return { inserted };
  }) as Promise<{ inserted: number }>;
}
