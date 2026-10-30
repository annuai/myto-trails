import { isValidSlug } from "@moto-trails/domain";
import type { Sql } from "postgres";
import type { RegionDto } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const mapRegion = (r: Row): RegionDto => ({
  kind: r.kind,
  name: r.name,
  slug: r.slug,
  parentSlug: r.parent_slug,
  publishedTrailCount: r.published_trail_count,
  countrySlug: r.country_slug,
  countryIso2: r.country_iso2,
});

export async function queryRegionBySlugs(sql: Sql, countrySlug: string, stateSlug: string, districtSlug?: string): Promise<RegionDto | null> {
  if (!isValidSlug(countrySlug) || !isValidSlug(stateSlug) || (districtSlug !== undefined && !isValidSlug(districtSlug))) return null;
  const rows = (
    districtSlug === undefined
      ? await sql`select * from public_regions where kind = 'state' and slug = ${stateSlug} and country_slug = ${countrySlug}`
      : await sql`select * from public_regions where kind = 'district' and slug = ${districtSlug} and parent_slug = ${stateSlug} and country_slug = ${countrySlug}`
  ) as Row[];
  return rows[0] ? mapRegion(rows[0]) : null;
}

export async function queryStates(sql: Sql): Promise<RegionDto[]> {
  return ((await sql`select * from public_regions where kind = 'state' order by name`) as Row[]).map(mapRegion);
}

export async function queryDistricts(sql: Sql, countrySlug: string, stateSlug: string): Promise<RegionDto[]> {
  if (!isValidSlug(countrySlug) || !isValidSlug(stateSlug)) return [];
  return ((await sql`select * from public_regions where kind = 'district' and parent_slug = ${stateSlug} and country_slug = ${countrySlug} order by name`) as Row[]).map(mapRegion);
}

/** States that have at least one published trail, for the /regions hub. */
export async function queryRegionsForHub(sql: Sql): Promise<RegionDto[]> {
  return (await queryStates(sql)).filter((s) => s.publishedTrailCount >= 1);
}
