import { COUNTRY_CONFIGS, INDIA_STATES, type CountryConfig } from "@moto-trails/domain";
import type { Sql } from "postgres";

export type CountrySeed = {
  config: CountryConfig;
  slug: string;
  /** Only an open country accepts trails; everything else is "coming soon". */
  enabled: boolean;
  admin1: { name: string; slug: string }[];
};

/** Idempotently inserts a country and its first-level regions. Districts are created on demand. */
export async function seedCountry(sql: Sql, seed: CountrySeed): Promise<{ inserted: number }> {
  return sql.begin(async (tx) => {
    let inserted = 0;
    const { config } = seed;
    const country = await tx`
      insert into region (kind, name, slug, iso2, enabled, config)
      values ('country', ${config.name}, ${seed.slug}, ${config.iso2}, ${seed.enabled}, ${tx.json(config as never)})
      on conflict do nothing returning id`;
    inserted += country.length;
    // Config is kept current on every run; `enabled` is only ever changed on purpose, in the database.
    const [row] = await tx`
      update region set iso2 = ${config.iso2}, config = ${tx.json(config as never)}
      where kind = 'country' and slug = ${seed.slug} and parent_id is null returning id`;
    for (const s of seed.admin1) {
      const rows = await tx`
        insert into region (kind, name, slug, parent_id) values ('state', ${s.name}, ${s.slug}, ${row!.id})
        on conflict do nothing returning id`;
      inserted += rows.length;
    }
    return { inserted };
  }) as Promise<{ inserted: number }>;
}

/** Idempotently inserts India (open) and its 28 states and 8 union territories. */
export function seedRegions(sql: Sql): Promise<{ inserted: number }> {
  return seedCountry(sql, { config: COUNTRY_CONFIGS.IN!, slug: "india", enabled: true, admin1: INDIA_STATES });
}
