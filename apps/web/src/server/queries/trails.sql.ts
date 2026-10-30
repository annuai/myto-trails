import { effectiveCondition, effectiveVerificationLevel, isRegionIndexable, isValidSlug, type OperationalStatus, type VerificationLevel } from "@moto-trails/domain";
import type { Sql } from "postgres";
import type { CoverDto, MediaDto, RouteDto, VideoDto, TrailDetailDto, TrailSummaryDto } from "./types";

// Uncached query functions. Callers pass a connection that is already running as the anonymous role
// (see withPublicRole). Slugs are validated first and always sent as query parameters.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const iso = (d: Date | string) => (d instanceof Date ? d.toISOString() : d);
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export function mapSummary(r: Row, now: Date): TrailSummaryDto {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    summary: r.summary,
    nearestTown: r.nearest_town,
    state: { slug: r.state_slug, name: r.state_name },
    district: r.district_slug ? { slug: r.district_slug, name: r.district_name } : null,
    country: r.country_slug ? { slug: r.country_slug, iso2: r.country_iso2 } : null,
    difficulty: r.difficulty,
    terrain: r.terrain,
    distanceKm: num(r.distance_km),
    estDurationMin: num(r.est_duration_min),
    accessClass: r.access_class,
    condition: effectiveCondition({ status: r.condition_current as OperationalStatus, expectedUntil: r.condition_expected_until }, now),
    rawCondition: r.condition_current,
    conditionExpectedUntil: r.condition_expected_until,
    verification: effectiveVerificationLevel({ level: r.verification_level as VerificationLevel, validUntil: r.valid_until }, now),
    rawVerificationLevel: r.verification_level,
    verifiedAt: r.verified_at,
    validUntil: r.valid_until,
    isSample: r.is_sample,
    updatedAt: iso(r.updated_at),
  };
}

export async function queryTrailBySlug(sql: Sql, slug: string, now: Date): Promise<TrailDetailDto | null> {
  if (!isValidSlug(slug)) return null;
  const [r] = (await sql`select * from public_trail_detail where slug = ${slug}`) as Row[];
  if (!r) return null;
  return {
    ...mapSummary(r, now),
    description: r.description,
    suitableFor: r.suitable_for,
    bestMonths: r.best_months,
    seasonNotes: r.season_notes,
    hazards: r.hazards,
    safetyNotes: r.safety_notes,
    surfaceNotes: r.surface_notes,
    routeShape: r.route_shape,
    elevationGainM: num(r.elevation_gain_m),
    version: r.version_no,
    contributorCredit: r.contributor_credit,
    restrictions: r.restrictions ?? [],
    permissionInstructions: r.permission_instructions,
    evidenceCount: r.evidence_count,
    evidenceKinds: r.evidence_kinds,
    conditionReason: r.condition_reason,
    conditionNote: r.condition_note,
    sensitivity: r.sensitivity,
    location: r.lon === null || r.lat === null ? null : { lon: Number(r.lon), lat: Number(r.lat) },
    firstPublishedAt: r.first_published_at ? iso(r.first_published_at) : null,
    openClosureReports: Number(r.open_closure_reports ?? 0),
    hasGpx: Boolean(r.has_gpx),
  };
}

export async function queryTrailRoute(sql: Sql, slug: string): Promise<RouteDto | null> {
  if (!isValidSlug(slug)) return null;
  const [r] = (await sql`select * from public_trail_route where slug = ${slug}`) as Row[];
  if (!r) return null;
  return {
    distanceKm: Number(r.distance_km),
    elevGainM: num(r.elev_gain_m),
    elevLossM: num(r.elev_loss_m),
    minElevM: num(r.min_elev_m),
    maxElevM: num(r.max_elev_m),
    pointCount: r.point_count,
    profile: r.profile ?? null,
    line: (JSON.parse(r.simplified_geojson) as { coordinates: [number, number][] }).coordinates,
  };
}

export async function queryTrailMedia(sql: Sql, slug: string): Promise<MediaDto[]> {
  if (!isValidSlug(slug)) return [];
  const rows = (await sql`
    select role, position, caption, alt_text, credit, variants, width, height
    from public_trail_media where trail_slug = ${slug} order by position`) as Row[];
  return rows.map((m) => ({
    role: m.role,
    position: m.position,
    caption: m.caption,
    altText: m.alt_text,
    credit: m.credit,
    variants: m.variants as Record<string, string>,
    width: m.width,
    height: m.height,
  }));
}

export async function queryTrailVideos(sql: Sql, slug: string): Promise<VideoDto[]> {
  if (!isValidSlug(slug)) return [];
  const rows = (await sql`
    select position, description, caption, credit, mp4_url, poster_url, width, height, duration_s
    from public_trail_video where trail_slug = ${slug} order by position`) as Row[];
  return rows.map((v) => ({
    position: v.position, description: v.description, caption: v.caption, credit: v.credit,
    mp4Url: v.mp4_url, posterUrl: v.poster_url, width: v.width, height: v.height, durationS: v.duration_s,
  }));
}

/** Adds each trail's cover photo (one query for the whole list). Trails without a photo get `cover: null`. */
export async function attachCovers<T extends { slug: string }>(sql: Sql, items: T[]): Promise<(T & { cover: CoverDto | null })[]> {
  const slugs = [...new Set(items.map((i) => i.slug))].filter(isValidSlug);
  const byslug = new Map<string, CoverDto>();
  if (slugs.length > 0) {
    const rows = (await sql`
      select distinct on (trail_slug) trail_slug, variants, alt_text, width, height
      from public_trail_media where trail_slug = any(${slugs}::text[]) and role = 'cover'
      order by trail_slug, position`) as Row[];
    for (const r of rows) byslug.set(r.trail_slug, { variants: r.variants as Record<string, string>, altText: r.alt_text, width: r.width, height: r.height });
  }
  return items.map((i) => ({ ...i, cover: byslug.get(i.slug) ?? null }));
}

export async function queryTrailsInRegion(
  sql: Sql,
  region: { countrySlug: string; stateSlug: string; districtSlug?: string },
  now: Date,
): Promise<TrailSummaryDto[]> {
  if (!isValidSlug(region.countrySlug) || !isValidSlug(region.stateSlug) || (region.districtSlug !== undefined && !isValidSlug(region.districtSlug))) return [];
  const district = region.districtSlug ?? null;
  const rows = (await sql`
    select * from public_trails
    where country_slug = ${region.countrySlug} and state_slug = ${region.stateSlug} and (${district}::text is null or district_slug = ${district})
    order by name`) as Row[];
  return attachCovers(sql, rows.map((r) => mapSummary(r, now)));
}

export async function querySitemapEntries(
  sql: Sql,
  opts: { excludeSample: boolean },
): Promise<{ trails: { slug: string; updatedAt: string }[]; regions: { path: string }[] }> {
  const trails = (await sql`
    select slug, updated_at from public_trails where (${!opts.excludeSample} or not is_sample) order by slug`) as Row[];
  const counts = (await sql`
    select country_slug, state_slug, district_slug, count(*)::int as n from public_trails
    where (${!opts.excludeSample} or not is_sample)
    group by country_slug, state_slug, district_slug`) as Row[];

  const stateCounts = new Map<string, number>();
  const regions: { path: string }[] = [];
  for (const c of counts) {
    const base = `/regions/${c.country_slug ?? "india"}/${c.state_slug}`;
    stateCounts.set(base, (stateCounts.get(base) ?? 0) + c.n);
    if (c.district_slug && isRegionIndexable(c.n)) regions.push({ path: `${base}/${c.district_slug}` });
  }
  for (const [path, n] of stateCounts) if (isRegionIndexable(n)) regions.push({ path });
  regions.sort((a, b) => a.path.localeCompare(b.path));
  return { trails: trails.map((t) => ({ slug: t.slug, updatedAt: iso(t.updated_at) })), regions };
}
