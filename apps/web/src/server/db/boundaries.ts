import type { Sql, TransactionSql } from "postgres";

type Db = Sql | TransactionSql;

type Ring = number[][];
export type BoundaryFeature = { iso2: string; geometry: { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] } };
export type LatLon = { lat: number; lon: number };

/** Idempotently stores country outlines. A feature whose ISO code has no `region` row is skipped. */
export async function loadBoundaries(sql: Db, features: BoundaryFeature[]): Promise<{ loaded: number }> {
  let loaded = 0;
  for (const f of features) {
    const geojson = JSON.stringify(f.geometry);
    const rows = await sql`
      insert into country_boundary (country_id, geom)
      select r.id, st_multi(st_setsrid(st_geomfromgeojson(${geojson}), 4326))
      from region r where r.kind = 'country' and r.iso2 = ${f.iso2}
      on conflict (country_id) do update set geom = excluded.geom
      returning country_id`;
    loaded += rows.length;
  }
  return { loaded };
}

/** The country whose outline contains the point, or null for open sea or a gap between outlines. */
export async function countryAt(sql: Db, point: LatLon): Promise<{ countryId: string; iso2: string; enabled: boolean } | null> {
  const [row] = await sql`
    select r.id, r.iso2, r.enabled
    from country_boundary b join region r on r.id = b.country_id
    where st_contains(b.geom, st_setsrid(st_makepoint(${point.lon}, ${point.lat}), 4326))
    limit 1`;
  return row ? { countryId: row.id as string, iso2: row.iso2 as string, enabled: row.enabled as boolean } : null;
}

/** True only when the point is inside a country Moto Trails is open in. */
export async function openCountryAt(sql: Db, point: LatLon): Promise<boolean> {
  return (await countryAt(sql, point))?.enabled === true;
}
