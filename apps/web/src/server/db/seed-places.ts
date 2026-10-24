import type { Sql } from "postgres";

export type PlaceSeed = {
  slug: string;
  name: string;
  altNames: string[];
  kind: "city" | "town" | "village" | "hill_station";
  state: string;
  lat: number;
  lon: number;
  rank: number;
};

/** Idempotently inserts the built-in gazetteer. Existing slugs are left unchanged. */
export async function seedPlaces(sql: Sql, places: PlaceSeed[]): Promise<{ inserted: number }> {
  return sql.begin(async (tx) => {
    let inserted = 0;
    for (const p of places) {
      const [state] = await tx`select id from region where kind = 'state' and slug = ${p.state}`;
      if (!state) throw new Error(`Unknown state: ${p.state}`);
      const rows = await tx`
        insert into place (slug, name, alt_names, kind, state_id, point, rank)
        values (${p.slug}, ${p.name}, ${p.altNames}, ${p.kind}, ${state.id},
          ST_SetSRID(ST_MakePoint(${p.lon}, ${p.lat}), 4326)::geography, ${p.rank})
        on conflict (slug) do nothing returning id`;
      inserted += rows.length;
    }
    return { inserted };
  }) as Promise<{ inserted: number }>;
}
