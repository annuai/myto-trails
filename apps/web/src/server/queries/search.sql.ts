import { estimateTravel, isValidSlug } from "@moto-trails/domain";
import type { Sql } from "postgres";
import { PAGE_SIZE, type SearchParams } from "@/features/discovery/search-params";
import { mapSummary } from "./trails.sql";
import type { TrailSummaryDto } from "./types";

// Uncached search queries. Run them on a connection that is already the anonymous role (withPublicRole).
// Everything user-supplied is a bound parameter; LIKE wildcards in user text are escaped.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export type SearchItem = TrailSummaryDto & {
  /** Public location only (the approximate point for sensitive trails). */
  lon: number | null;
  lat: number | null;
  distanceFromKm: number | null;
  travel: { oneWayMin: number; roundTripMin: number } | null;
};

export type SearchOrigin = { kind: "place"; slug: string; name: string } | { kind: "point" };

export type SearchResult = {
  items: SearchItem[];
  total: number;
  page: number;
  pageSize: number;
  origin: SearchOrigin | null;
  unknownPlace?: true;
};

export type PlaceDto = { slug: string; name: string; stateName: string; lat: number; lon: number };

const CONTROL = /[\u0000-\u001f\u007f]/g;
const clean = (q: string) => q.replace(CONTROL, " ").trim().slice(0, 100);
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function findPlace(sql: Sql, slug: string): Promise<PlaceDto | null> {
  if (!isValidSlug(slug)) return null;
  const [r] = (await sql`select slug, name, state_name, lat, lon from public_places where slug = ${slug}`) as Row[];
  return r ? { slug: r.slug, name: r.name, stateName: r.state_name, lat: Number(r.lat), lon: Number(r.lon) } : null;
}

const validPoint = (p: { lat: number; lon: number } | undefined) =>
  p !== undefined && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;

export async function searchTrails(
  sql: Sql,
  p: SearchParams,
  now: Date,
  opts: { point?: { lat: number; lon: number } } = {},
): Promise<SearchResult> {
  let originPoint: { lat: number; lon: number } | null = null;
  let origin: SearchOrigin | null = null;

  if (p.near && p.near !== "me") {
    const place = await findPlace(sql, p.near);
    if (!place) return { items: [], total: 0, page: p.page, pageSize: PAGE_SIZE, origin: null, unknownPlace: true };
    originPoint = { lat: place.lat, lon: place.lon };
    origin = { kind: "place", slug: place.slug, name: place.name };
  } else if (p.near === "me" && validPoint(opts.point)) {
    originPoint = opts.point!;
    origin = { kind: "point" };
  }

  const originGeog = originPoint ? sql`ST_SetSRID(ST_MakePoint(${originPoint.lon}, ${originPoint.lat}), 4326)::geography` : null;
  const conds: ReturnType<Sql>[] = [];
  const q = clean(p.q);
  const like = `%${escapeLike(q)}%`;

  if (q) {
    conds.push(sql`(search_tsv @@ websearch_to_tsquery('simple', ${q}) or name ilike ${like} or nearest_town ilike ${like})`);
  }
  if (p.state) conds.push(sql`state_slug = ${p.state}`);
  if (p.district) conds.push(sql`district_slug = ${p.district}`);
  if (p.terrain.length) conds.push(sql`terrain && ${p.terrain}::text[]`);
  if (p.difficulty.length) conds.push(sql`difficulty = any(${p.difficulty}::text[])`);
  if (p.access.length) conds.push(sql`access_class = any(${p.access}::text[])`);
  if (p.suitable.length) conds.push(sql`suitable_for && ${p.suitable}::text[]`);
  if (p.verified) conds.push(sql`is_verified`);
  if (p.month) conds.push(sql`${p.month}::int = any(best_months)`);
  if (p.minKm !== undefined) conds.push(sql`distance_km >= ${p.minKm}`);
  if (p.maxKm !== undefined) conds.push(sql`distance_km <= ${p.maxKm}`);
  if (!p.showClosed) conds.push(sql`not closed`);
  if (originGeog) conds.push(sql`geog is not null and st_dwithin(geog, ${originGeog}, ${p.radius * 1000})`);

  const where = conds.length ? conds.reduce((a, c) => sql`${a} and ${c}`) : sql`true`;
  const rank = q ? sql`(ts_rank(search_tsv, websearch_to_tsquery('simple', ${q})) + similarity(name, ${q}))` : sql`0`;
  const distance = originGeog ? sql`(st_distance(geog, ${originGeog}) / 1000.0)` : sql`null::float8`;

  let sort = p.sort;
  if (sort === "nearest" && !originGeog) sort = "recent";
  const order =
    sort === "relevance" ? sql`rank desc, name asc`
    : sort === "nearest" ? sql`distance_from_km asc nulls last, name asc`
    : sort === "distance" ? sql`distance_km asc nulls last, name asc`
    : sort === "difficulty" ? sql`(case difficulty when 'easy' then 1 when 'moderate' then 2 when 'hard' then 3 else 4 end) asc, name asc`
    : sql`first_published_at desc nulls last, name asc`;

  const rows = (await sql`
    select s.*, ${distance} as distance_from_km, ${rank} as rank, count(*) over()::int as total_count
    from public_trail_search s
    where ${where}
    order by ${order}
    limit ${PAGE_SIZE} offset ${(p.page - 1) * PAGE_SIZE}`) as Row[];

  const items: SearchItem[] = rows.map((r) => {
    const distanceFromKm = r.distance_from_km === null ? null : Number(r.distance_from_km);
    return {
      ...mapSummary(r, now),
      lon: r.lon === null ? null : Number(r.lon),
      lat: r.lat === null ? null : Number(r.lat),
      distanceFromKm,
      travel: distanceFromKm === null ? null : estimateTravel(distanceFromKm),
    };
  });
  let total: number = rows[0]?.total_count ?? 0;
  if (rows.length === 0 && p.page > 1) {
    // A page past the end has no rows to carry the window count, so count separately.
    const [c] = (await sql`select count(*)::int as n from public_trail_search s where ${where}`) as Row[];
    total = c?.n ?? 0;
  }
  return { items, total, page: p.page, pageSize: PAGE_SIZE, origin };
}

export type Suggestions = {
  trails: { slug: string; name: string; place: string }[];
  places: { slug: string; name: string; state: string }[];
  regions: { slug: string; name: string }[];
};

export async function suggest(sql: Sql, rawQuery: string): Promise<Suggestions> {
  const q = clean(rawQuery);
  if (!q) return { trails: [], places: [], regions: [] };
  const lower = q.toLowerCase();
  const prefix = `${escapeLike(lower)}%`;
  const contains = `%${escapeLike(lower)}%`;

  const [trails, places, regions] = await Promise.all([
    sql`select slug, name, state_name, district_name from public_trails
        where name ilike ${contains}
        order by (name ilike ${prefix}) desc, similarity(name, ${q}) desc, name limit 5`,
    sql`select slug, name, state_name from public_places
        where search_text like ${prefix} or search_text like ${`% ${escapeLike(lower)}%`} or search_text % ${lower}
        order by (search_text like ${prefix}) desc, similarity(search_text, ${lower}) desc, rank asc, name limit 5`,
    sql`select slug, name from public_regions where kind = 'state' and name ilike ${prefix} order by name limit 5`,
  ]);
  return {
    trails: (trails as Row[]).map((r) => ({ slug: r.slug, name: r.name, place: [r.district_name, r.state_name].filter(Boolean).join(", ") })),
    places: (places as Row[]).map((r) => ({ slug: r.slug, name: r.name, state: r.state_name })),
    regions: (regions as Row[]).map((r) => ({ slug: r.slug, name: r.name })),
  };
}
