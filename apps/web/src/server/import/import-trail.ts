import { createHash, randomUUID } from "node:crypto";
import { slugify } from "@moto-trails/domain";
import type { Sql } from "postgres";
import { ensureDistrict } from "../db/regions";
import { ingestGpx, insertRoute } from "../gpx/ingest";
import type { StorageProvider } from "../storage";
import { TrailImportSchema } from "./schema";

export class ImportError extends Error {
  constructor(
    message: string,
    readonly code: "invalid" | "rule" | "exists",
  ) {
    super(message);
    this.name = "ImportError";
  }
}

const point = (p: { lon: number; lat: number }) => `SRID=4326;POINT(${p.lon} ${p.lat})`;

/**
 * Validates and imports one trail (trail, approved revision, access assessment, evidence, condition, media)
 * in a single transaction. Messages name fields only and never echo values.
 */
export async function importTrail(
  sql: Sql,
  record: unknown,
  opts: { production: boolean; allowSamples?: boolean; gpx?: { read(path: string): Uint8Array | null; storage: StorageProvider } },
): Promise<{ slug: string; trailId: string }> {
  const parsed = TrailImportSchema.safeParse(record);
  if (!parsed.success) {
    throw new ImportError(`Invalid record: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`, "invalid");
  }
  const t = parsed.data;
  if (t.sample && opts.production) throw new ImportError("Sample records cannot be imported in production", "rule");
  if (t.sample && !opts.allowSamples) {
    throw new ImportError("Sample records are for development databases only; pass --allow-samples to import them", "rule");
  }
  if (t.publish && t.access.accessClass === "private_no_access") {
    throw new ImportError("A trail with access class private_no_access cannot be published", "rule");
  }

  const slug = t.slug ?? slugify(t.name);
  if (!slug) throw new ImportError("Invalid record: name cannot form a slug", "invalid");

  // Read and validate the GPX before opening the transaction, so a bad file leaves nothing behind.
  let route: { ingested: Extract<ReturnType<typeof ingestGpx>, { ok: true }>; bytes: Uint8Array } | undefined;
  if (t.gpxFile) {
    if (!opts.gpx) throw new ImportError(`${t.gpxFile}: a GPX file was named but no GPX source is configured`, "invalid");
    const bytes = opts.gpx.read(t.gpxFile);
    if (!bytes) throw new ImportError(`${t.gpxFile}: GPX file not found`, "invalid");
    const ingested = ingestGpx(bytes);
    if (!ingested.ok) throw new ImportError(`${t.gpxFile}: invalid GPX: ${ingested.message}`, "invalid");
    route = { ingested, bytes };
  }

  return sql.begin(async (tx) => {
    const [state] = await tx`select id from region where kind = 'state' and slug = ${t.state}`;
    if (!state) throw new ImportError(`Unknown state: ${t.state}`, "invalid");
    const [existing] = await tx`select 1 from trail where slug = ${slug}`;
    if (existing) throw new ImportError(`Trail ${slug} already exists`, "exists");

    const district = await ensureDistrict(tx as unknown as Sql, t.state, t.district);
    const [trail] = await tx`
      insert into trail (slug, region_id, state_id, lifecycle, sensitivity, is_sample, public_point)
      values (${slug}, ${district.id}, ${state.id}, 'draft', ${t.sensitivity}, ${t.sample},
        ${t.publicPoint ? tx`${point(t.publicPoint)}::geography` : null})
      returning id`;
    const trailId = trail!.id as string;

    const [revision] = await tx`
      insert into trail_revision (trail_id, version_no, state, name, summary, description, nearest_town, start_point, route_shape,
        distance_km, est_duration_min, elevation_gain_m, difficulty, terrain, suitable_for, best_months, season_notes, hazards,
        safety_notes, surface_notes, contributor_credit, decided_at)
      values (${trailId}, 1, 'approved', ${t.name}, ${t.summary}, ${t.description ?? null}, ${t.nearestTown},
        ${point(t.startPoint)}::geography, ${t.routeShape ?? null}, ${t.distanceKm ?? null}, ${t.estDurationMin ?? null},
        ${t.elevationGainM ?? null}, ${t.difficulty}, ${t.terrain}, ${t.suitableFor}, ${t.bestMonths}, ${t.seasonNotes ?? null},
        ${t.hazards}, ${t.safetyNotes ?? null}, ${t.surfaceNotes ?? null}, ${t.contributorCredit}, now())
      returning id`;
    const revisionId = revision!.id as string;

    const [assessment] = await tx`
      insert into access_assessment (trail_id, access_class, restrictions, permission_instructions, permission_contact, basis, level, verified_at, valid_until)
      values (${trailId}, ${t.access.accessClass}, ${t.access.restrictions}, ${t.access.permissionInstructions ?? null},
        ${t.access.permissionContact ?? null}, ${t.access.basis}, ${t.access.level}, ${t.access.verifiedAt ?? null}, ${t.access.validUntil ?? null})
      returning id`;
    for (const e of t.access.evidence) {
      await tx`insert into evidence (assessment_id, kind, description, url) values (${assessment!.id}, ${e.kind}, ${e.description}, ${e.url ?? null})`;
    }

    await tx`
      insert into condition_event (trail_id, status, reason, effective_from, expected_until, note, source)
      values (${trailId}, ${t.condition.status}, ${t.condition.reason ?? null}, ${t.condition.effectiveFrom},
        ${t.condition.expectedUntil ?? null}, ${t.condition.note ?? null}, 'moderator')`;

    for (const m of t.media) {
      await tx`
        insert into media (revision_id, role, position, caption, alt_text, credit, variants, width, height)
        values (${revisionId}, ${m.role}, ${m.position}, ${m.caption ?? null}, ${m.altText}, ${m.credit ?? null},
          ${tx.json(m.variants)}, ${m.width ?? null}, ${m.height ?? null})`;
    }

    for (const v of t.videos) {
      await tx`
        insert into trail_video (revision_id, position, description, caption, credit, mp4_url, poster_url, width, height, duration_s)
        values (${revisionId}, ${v.position}, ${v.description}, ${v.caption ?? null}, ${v.credit ?? null}, ${v.mp4}, ${v.poster}, ${v.width}, ${v.height}, ${v.durationS})`;
    }

    if (route && opts.gpx) {
      const objectId = randomUUID();
      const originalKey = `gpx/${trailId}/${objectId}.gpx`;
      const cleanKey = `gpx/${trailId}/${objectId}-clean.gpx`;
      await opts.gpx.storage.put("originals", originalKey, route.bytes, "application/gpx+xml");
      await opts.gpx.storage.put("originals", cleanKey, new TextEncoder().encode(route.ingested.cleanGpx), "application/gpx+xml");
      await insertRoute(tx, {
        ingested: route.ingested,
        revisionId,
        userId: null,
        originalKey,
        cleanKey,
        sha256: createHash("sha256").update(route.bytes).digest("hex"),
        sizeBytes: route.bytes.byteLength,
      });
    }

    if (t.publish) {
      await tx`update trail set lifecycle = 'published', published_revision_id = ${revisionId}, first_published_at = now() where id = ${trailId}`;
    }
    return { slug, trailId };
  }) as Promise<{ slug: string; trailId: string }>;
}
