import type { Sql } from "postgres";

export type TrailFixture = {
  slug: string;
  name: string;
  summary: string;
  lifecycle: "draft" | "in_review" | "published" | "unpublished" | "archived";
  linkPublishedRevision: boolean;
  sensitivity: "standard" | "sensitive" | "restricted_geometry";
  isSample: boolean;
  state: { slug: string; name: string };
  district: { slug: string; name: string } | null;
  accessClass: "public" | "permission_required" | "private_no_access" | "restricted" | "unknown";
  verificationLevel: "officially_verified" | "moderator_verified" | "community_reported" | "unverified";
  verifiedAt: string | null;
  validUntil: string | null;
  conditionStatus: "open" | "temporarily_closed" | "permanently_closed" | "seasonal" | "unknown" | null;
  expectedUntil: string | null;
  conditionReason: string | null;
  permissionContact: string | null;
  permissionInstructions: string | null;
  restrictions: string[];
  evidence: { kind: string; description: string }[];
  startPoint: { lon: number; lat: number };
  publicPoint: { lon: number; lat: number } | null;
  mediaCount: number;
  distanceKm: number | null;
  difficulty: "easy" | "moderate" | "hard" | "expert";
  terrain: string[];
  bestMonths: number[];
  suitableFor: string[];
};

let counter = 0;

/** Inserts a trail with one approved revision, an access assessment, an optional condition event and media. */
export async function insertTrailFixture(
  sql: Sql,
  overrides: Partial<TrailFixture> = {},
): Promise<{ trailId: string; revisionId: string; slug: string }> {
  const n = ++counter;
  const f: TrailFixture = {
    slug: `fixture-trail-${n}`,
    name: `Fixture trail ${n}`,
    summary: "A fixture trail summary that is comfortably longer than forty characters.",
    lifecycle: "published",
    linkPublishedRevision: true,
    sensitivity: "standard",
    isSample: false,
    state: { slug: "fixture-state", name: "Fixture State" },
    district: { slug: "fixture-district", name: "Fixture District" },
    accessClass: "public",
    verificationLevel: "moderator_verified",
    verifiedAt: "2026-01-01",
    validUntil: "2099-01-01",
    conditionStatus: "open",
    expectedUntil: null,
    conditionReason: null,
    permissionContact: null,
    permissionInstructions: null,
    restrictions: [],
    evidence: [],
    startPoint: { lon: 76.1, lat: 11.6 },
    publicPoint: null,
    mediaCount: 0,
    distanceKm: 24.1,
    difficulty: "moderate",
    terrain: ["gravel"],
    bestMonths: [],
    suitableFor: [],
    ...overrides,
  };

  const [stateRow] = await sql`
    insert into region (kind, name, slug) values ('state', ${f.state.name}, ${f.state.slug})
    on conflict (parent_id, slug) do update set name = excluded.name returning id`;
  let regionId = stateRow!.id as string;
  if (f.district) {
    const [d] = await sql`
      insert into region (kind, name, slug, parent_id) values ('district', ${f.district.name}, ${f.district.slug}, ${stateRow!.id})
      on conflict (parent_id, slug) do update set name = excluded.name returning id`;
    regionId = d!.id as string;
  }

  const publicPoint = f.publicPoint ? sql`ST_SetSRID(ST_MakePoint(${f.publicPoint.lon}, ${f.publicPoint.lat}), 4326)::geography` : null;
  const [trail] = await sql`
    insert into trail (slug, region_id, state_id, lifecycle, sensitivity, is_sample, public_point, first_published_at)
    values (${f.slug}, ${regionId}, ${stateRow!.id}, ${f.lifecycle}, ${f.sensitivity}, ${f.isSample}, ${publicPoint},
      ${f.lifecycle === "published" ? sql`now()` : null})
    returning id`;
  const trailId = trail!.id as string;

  const [revision] = await sql`
    insert into trail_revision (trail_id, version_no, state, name, summary, nearest_town, start_point, difficulty, terrain, distance_km, best_months, suitable_for, decided_at)
    values (${trailId}, 1, 'approved', ${f.name}, ${f.summary}, 'Fixture Town',
      ST_SetSRID(ST_MakePoint(${f.startPoint.lon}, ${f.startPoint.lat}), 4326)::geography, ${f.difficulty}, ${f.terrain}, ${f.distanceKm}, ${f.bestMonths}, ${f.suitableFor}, now())
    returning id`;
  const revisionId = revision!.id as string;
  if (f.linkPublishedRevision) await sql`update trail set published_revision_id = ${revisionId} where id = ${trailId}`;

  const [assessment] = await sql`
    insert into access_assessment (trail_id, access_class, restrictions, permission_instructions, permission_contact, basis, level, verified_at, valid_until)
    values (${trailId}, ${f.accessClass}, ${f.restrictions}, ${f.permissionInstructions}, ${f.permissionContact}, 'owner_confirmed',
      ${f.verificationLevel}, ${f.verifiedAt}, ${f.validUntil})
    returning id`;
  for (const e of f.evidence) {
    await sql`insert into evidence (assessment_id, kind, description) values (${assessment!.id}, ${e.kind}, ${e.description})`;
  }
  if (f.conditionStatus) {
    await sql`insert into condition_event (trail_id, status, reason, effective_from, expected_until, source)
      values (${trailId}, ${f.conditionStatus}, ${f.conditionReason}, '2026-01-01', ${f.expectedUntil}, 'moderator')`;
  }
  for (let i = 0; i < f.mediaCount; i++) {
    await sql`insert into media (revision_id, role, position, caption, alt_text, credit, variants, width, height)
      values (${revisionId}, ${i === 0 ? "cover" : "gallery"}, ${i}, ${"Caption " + i}, ${"Alt text " + i}, 'Fixture credit',
        ${sql.json({ "800": `https://example.test/${f.slug}-${i}-800.webp` })}, 1200, 800)`;
  }
  return { trailId, revisionId, slug: f.slug };
}
