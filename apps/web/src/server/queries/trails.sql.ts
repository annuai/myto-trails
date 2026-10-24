import { effectiveCondition, effectiveVerificationLevel, isRegionIndexable, isValidSlug, type OperationalStatus, type VerificationLevel } from "@moto-trails/domain";
import type { Sql } from "postgres";
import type { MediaDto, TrailDetailDto, TrailSummaryDto } from "./types";

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
    difficulty: r.difficulty,
    terrain: r.terrain,
    distanceKm: num(r.distance_km),
    estDurationMin: num(r.est_duration_min),
    accessClass: r.access_class,
    condition: effectiveCondition({ status: r.condition_current as OperationalStatus, expectedUntil: r.condition_expected_until }, now),
    conditionExpectedUntil: r.condition_expected_until,
    verification: effectiveVerificationLevel({ level: r.verification_level as VerificationLevel, validUntil: r.valid_until }, now),
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

export async function queryTrailsInRegion(
  sql: Sql,
  region: { stateSlug: string; districtSlug?: string },
  now: Date,
): Promise<TrailSummaryDto[]> {
  if (!isValidSlug(region.stateSlug) || (region.districtSlug !== undefined && !isValidSlug(region.districtSlug))) return [];
  const district = region.districtSlug ?? null;
  const rows = (await sql`
    select * from public_trails
    where state_slug = ${region.stateSlug} and (${district}::text is null or district_slug = ${district})
    order by name`) as Row[];
  return rows.map((r) => mapSummary(r, now));
}

export async function querySitemapEntries(
  sql: Sql,
  opts: { excludeSample: boolean },
): Promise<{ trails: { slug: string; updatedAt: string }[]; regions: { path: string }[] }> {
  const trails = (await sql`
    select slug, updated_at from public_trails where (${!opts.excludeSample} or not is_sample) order by slug`) as Row[];
  const counts = (await sql`
    select state_slug, district_slug, count(*)::int as n from public_trails
    where (${!opts.excludeSample} or not is_sample)
    group by state_slug, district_slug`) as Row[];

  const stateCounts = new Map<string, number>();
  const regions: { path: string }[] = [];
  for (const c of counts) {
    stateCounts.set(c.state_slug, (stateCounts.get(c.state_slug) ?? 0) + c.n);
    if (c.district_slug && isRegionIndexable(c.n)) regions.push({ path: `/regions/${c.state_slug}/${c.district_slug}` });
  }
  for (const [state, n] of stateCounts) if (isRegionIndexable(n)) regions.push({ path: `/regions/${state}` });
  regions.sort((a, b) => a.path.localeCompare(b.path));
  return { trails: trails.map((t) => ({ slug: t.slug, updatedAt: iso(t.updated_at) })), regions };
}
