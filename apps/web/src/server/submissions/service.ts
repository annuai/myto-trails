import { slugify } from "@moto-trails/domain";
import type { Sql, TransactionSql } from "postgres";
import { STEPS, STEP_KEYS, validateAll, validateStep, type Step, type SubmissionData } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_OPEN_DRAFTS = 10;
const SUBMISSIONS_PER_DAY = 5;
const MAX_DRAFT_BYTES = 50_000;
const EDITABLE = ["draft", "changes_requested"];

export type Duplicate = { slug: string; name: string; similarity: number; reason: "route" | "name" };
export type RoutePreview = {
  distanceKm: number;
  elevGainM: number | null;
  elevLossM: number | null;
  pointCount: number;
  profile: { d: number; e: number }[] | null;
  line: [number, number][];
  start: { lat: number; lon: number };
};
export type SubmissionView = {
  id: string;
  status: string;
  step: number;
  /** Validated step values. */
  data: Partial<SubmissionData>;
  /** Raw, not yet valid input per step (autosave and failed saves), used to refill forms. */
  drafts: Record<string, unknown>;
  route: RoutePreview | null;
  duplicates: Duplicate[];
  moderatorFeedback: string | null;
  trailSlug: string | null;
  title: string | null;
  submittedAt: string | null;
  updatedAt: string;
};

type Row = {
  id: string; user_id: string; status: string; step: number; data: Record<string, unknown>; route_upload_id: string | null;
  duplicate_candidates: Duplicate[]; moderator_feedback: string | null; trail_id: string | null; revision_id: string | null;
  submitted_at: Date | null; updated_at: Date;
};

const COLUMNS = "id, user_id, status, step, data, route_upload_id, duplicate_candidates, moderator_feedback, trail_id, revision_id, submitted_at, updated_at";

async function loadRow(sql: Sql | TransactionSql, userId: string, id: string, lock = false): Promise<Row | null> {
  if (!UUID.test(id)) return null;
  const q = `select ${COLUMNS} from submission where id = $1 and user_id = $2${lock ? " for update" : ""}`;
  const [row] = await (sql as Sql).unsafe<Row[]>(q, [id, userId]);
  return row ?? null;
}

const splitData = (data: Record<string, unknown>) => {
  const { _drafts, ...validated } = data as { _drafts?: Record<string, unknown> } & Record<string, unknown>;
  return { validated: validated as Partial<SubmissionData>, drafts: _drafts ?? {} };
};

export async function createDraft(sql: Sql, i: { userId: string; clientId: string }): Promise<{ ok: true; id: string } | { ok: false; reason: "invalid" | "too_many_drafts" }> {
  if (!UUID.test(i.clientId)) return { ok: false, reason: "invalid" };
  const [existing] = await sql`select id from submission where user_id = ${i.userId} and client_id = ${i.clientId}`;
  if (existing) return { ok: true, id: existing.id as string };
  const [open] = await sql`select count(*)::int as n from submission where user_id = ${i.userId} and status = 'draft'`;
  if (open!.n >= MAX_OPEN_DRAFTS) return { ok: false, reason: "too_many_drafts" };
  const [row] = await sql`
    insert into submission (user_id, client_id) values (${i.userId}, ${i.clientId})
    on conflict (user_id, client_id) do update set user_id = excluded.user_id returning id`;
  return { ok: true, id: row!.id as string };
}

async function routePreview(sql: Sql | TransactionSql, routeUploadId: string | null, userId: string): Promise<RoutePreview | null> {
  if (!routeUploadId) return null;
  const [r] = await sql`
    select r.distance_km, r.elev_gain_m, r.elev_loss_m, r.point_count, r.profile, st_asgeojson(r.simplified, 5) as line,
      st_y(st_startpoint(r.geometry)) as lat, st_x(st_startpoint(r.geometry)) as lon
    from upload u join route r on r.id = u.route_id
    where u.id = ${routeUploadId} and u.user_id = ${userId}`;
  if (!r) return null;
  return {
    distanceKm: Number(r.distance_km),
    elevGainM: r.elev_gain_m,
    elevLossM: r.elev_loss_m,
    pointCount: r.point_count,
    profile: r.profile ?? null,
    line: (JSON.parse(r.line) as { coordinates: [number, number][] }).coordinates,
    start: { lat: Number(r.lat), lon: Number(r.lon) },
  };
}

const view = async (sql: Sql, row: Row): Promise<SubmissionView> => {
  const { validated, drafts } = splitData(row.data);
  const [t] = row.trail_id ? await sql`select slug from trail where id = ${row.trail_id}` : [];
  return {
    id: row.id,
    status: row.status,
    step: row.step,
    data: validated,
    drafts,
    route: await routePreview(sql, row.route_upload_id, row.user_id),
    duplicates: row.duplicate_candidates,
    moderatorFeedback: row.moderator_feedback,
    trailSlug: (t?.slug as string | undefined) ?? null,
    title: validated.basics?.name ?? ((drafts.basics as { name?: string } | undefined)?.name?.slice(0, 80) || null),
    submittedAt: row.submitted_at ? row.submitted_at.toISOString() : null,
    updatedAt: row.updated_at.toISOString(),
  };
};

export async function getMine(sql: Sql, userId: string, id: string): Promise<SubmissionView | null> {
  const row = await loadRow(sql, userId, id);
  return row ? view(sql, row) : null;
}

export async function listMine(sql: Sql, userId: string): Promise<{ id: string; status: string; title: string | null; trailSlug: string | null; updatedAt: string }[]> {
  const rows = await sql`
    select s.id, s.status, s.updated_at, t.slug,
      coalesce(s.data -> 'basics' ->> 'name', s.data -> '_drafts' -> 'basics' ->> 'name') as title
    from submission s left join trail t on t.id = s.trail_id
    where s.user_id = ${userId} and s.status <> 'withdrawn'
    order by s.updated_at desc limit 100`;
  return rows.map((r) => ({ id: r.id, status: r.status, title: r.title ? String(r.title).slice(0, 80) : null, trailSlug: r.slug ?? null, updatedAt: (r.updated_at as Date).toISOString() }));
}

/** Published trails that look like this draft: overlapping route and a similar name in the same state. Never other drafts. */
async function refreshDuplicates(tx: TransactionSql, row: Row, data: Record<string, unknown>): Promise<Duplicate[]> {
  const found: Duplicate[] = [];
  if (row.route_upload_id) {
    const byRoute = await tx`
      select t.slug, rev.name, s.similarity
      from upload u
      join route r on r.id = u.route_id
      cross join lateral find_similar_routes(r.simplified, r.id) s
      join route r2 on r2.id = s.route_id
      join trail t on t.published_revision_id = r2.revision_id and t.lifecycle = 'published'
      join trail_revision rev on rev.id = t.published_revision_id
      where u.id = ${row.route_upload_id} and u.user_id = ${row.user_id}
      order by s.similarity desc limit 5`;
    for (const d of byRoute) found.push({ slug: d.slug, name: d.name, similarity: Number(d.similarity), reason: "route" });
  }
  const basics = data.basics as { name?: string; state?: string } | undefined;
  if (basics?.name && basics.state) {
    const byName = await tx`
      select t.slug, rev.name, similarity(rev.name, ${basics.name}) as sim
      from trail t
      join trail_revision rev on rev.id = t.published_revision_id
      join region st on st.id = t.state_id and st.slug = ${basics.state}
      where t.lifecycle = 'published' and similarity(rev.name, ${basics.name}) >= 0.55
      order by sim desc limit 5`;
    for (const d of byName) if (!found.some((f) => f.slug === d.slug)) found.push({ slug: d.slug, name: d.name, similarity: Number(d.sim), reason: "name" });
  }
  return found;
}

export type SaveStepResult = { ok: true } | { ok: false; reason: "not_found" | "locked" | "too_large" | "invalid" } | { ok: false; errors: Record<string, string> };

/**
 * Saves one step. With `autosave`, the raw input is kept to refill the form and nothing is validated or advanced.
 * Otherwise the input is validated; invalid input returns field errors but is still kept for the form.
 */
export async function saveStep(sql: Sql, i: { userId: string; id: string; step: Step; input: unknown; autosave?: boolean }): Promise<SaveStepResult> {
  if (!UUID.test(i.id)) return { ok: false, reason: "not_found" };
  return sql.begin(async (tx): Promise<SaveStepResult> => {
    const row = await loadRow(tx, i.userId, i.id, true);
    if (!row) return { ok: false, reason: "not_found" };
    if (!EDITABLE.includes(row.status)) return { ok: false, reason: "locked" };

    const key = STEP_KEYS[i.step];
    const plain = i.step === 5 ? Array.isArray(i.input) : typeof i.input === "object" && i.input !== null && !Array.isArray(i.input);
    if (!plain) return { ok: false, reason: "invalid" };
    const raw = JSON.stringify(i.input);
    if (raw.length > MAX_DRAFT_BYTES) return { ok: false, reason: "too_large" };

    const data = { ...row.data } as Record<string, unknown> & { _drafts?: Record<string, unknown> };
    const drafts = { ...(data._drafts ?? {}) };
    let errors: Record<string, string> | null = null;
    let step = row.step;

    if (i.autosave) {
      drafts[key] = JSON.parse(raw);
    } else {
      const r = validateStep(i.step, i.input);
      if (r.ok && i.step === 5 && !(await photosOwned(tx, i.userId, (r.value as SubmissionData["photos"]).map((p) => p.mediaId), row.revision_id))) {
        errors = { photos: "One of these photos is no longer available. Remove it and add it again." };
      } else if (!r.ok) {
        errors = r.errors;
      }
      if (errors) {
        drafts[key] = JSON.parse(raw);
      } else if (r.ok) {
        data[key] = r.value;
        delete drafts[key];
        if (row.status === "draft") step = Math.max(row.step, Math.min(6, i.step + 1));
      }
    }
    if (Object.keys(drafts).length > 0) data._drafts = drafts;
    else delete data._drafts;

    const duplicates = i.step === 1 && !errors && !i.autosave ? await refreshDuplicates(tx, row, data) : row.duplicate_candidates;
    await tx`update submission set data = ${tx.json(data as never)}, step = ${step}, duplicate_candidates = ${tx.json(duplicates as never)}, updated_at = now() where id = ${row.id}`;
    return errors ? { ok: false, errors } : { ok: true };
  });
}

async function photosOwned(tx: TransactionSql, userId: string, ids: string[], currentRevisionId: string | null): Promise<boolean> {
  if (ids.length === 0) return true;
  const rows = await tx`select id from media where id in ${tx(ids)} and uploaded_by = ${userId} and (revision_id is null or revision_id = ${currentRevisionId})`;
  return rows.length === ids.length;
}

export async function attachRoute(
  sql: Sql,
  i: { userId: string; id: string; uploadId: string },
): Promise<{ ok: true; duplicates: Duplicate[] } | { ok: false; reason: "not_found" | "locked" }> {
  if (!UUID.test(i.id) || !UUID.test(i.uploadId)) return { ok: false, reason: "not_found" };
  return sql.begin(async (tx) => {
    const row = await loadRow(tx, i.userId, i.id, true);
    if (!row) return { ok: false as const, reason: "not_found" as const };
    if (!EDITABLE.includes(row.status)) return { ok: false as const, reason: "locked" as const };
    const [up] = await tx`select 1 from upload where id = ${i.uploadId} and user_id = ${i.userId} and kind = 'gpx' and status = 'ready' and route_id is not null`;
    if (!up) return { ok: false as const, reason: "not_found" as const };
    const next = { ...row, route_upload_id: i.uploadId };
    const duplicates = await refreshDuplicates(tx, next, row.data);
    await tx`update submission set route_upload_id = ${i.uploadId}, duplicate_candidates = ${tx.json(duplicates as never)}, updated_at = now() where id = ${row.id}`;
    return { ok: true as const, duplicates };
  });
}

/** Small preview URLs for the user's own photos, so the form can show what was attached. */
export async function photoPreviews(sql: Sql, userId: string, ids: string[]): Promise<Record<string, string>> {
  const valid = ids.filter((x) => UUID.test(x)).slice(0, 20);
  if (valid.length === 0) return {};
  const rows = await sql`select id, variants from media where id in ${sql(valid)} and uploaded_by = ${userId}`;
  return Object.fromEntries(rows.map((r) => [r.id as string, (r.variants as Record<string, string>)["400"] ?? Object.values(r.variants as Record<string, string>)[0] ?? ""]));
}

export async function listStates(sql: Sql): Promise<{ slug: string; name: string }[]> {
  const rows = await sql`select slug, name from region where kind = 'state' order by name`;
  return rows.map((r) => ({ slug: r.slug as string, name: r.name as string }));
}

export async function discardDraft(sql: Sql, i: { userId: string; id: string }): Promise<{ ok: true } | { ok: false; reason: "not_found" | "locked" }> {
  const row = await loadRow(sql, i.userId, i.id);
  if (!row) return { ok: false, reason: "not_found" };
  if (row.status !== "draft") return { ok: false, reason: "locked" };
  await sql`delete from submission where id = ${row.id} and status = 'draft'`;
  return { ok: true };
}

export type SubmitResult =
  | { ok: true; slug: string }
  | { ok: false; reason: "not_found" | "locked" | "rate_limited" | "photo_unavailable" }
  | { ok: false; reason: "invalid"; steps: Step[] };

class AttachmentUnavailable extends Error {}
const isUnique = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";

/** Turns a complete draft into a trail and revision awaiting moderation. Idempotent, and a resubmit adds a new revision. */
export async function submit(sql: Sql, i: { userId: string; id: string; now: Date }): Promise<SubmitResult> {
  if (!UUID.test(i.id)) return { ok: false, reason: "not_found" };
  for (let attempt = 0; ; attempt++) {
    try {
      return await sql.begin((tx) => submitTx(tx, i));
    } catch (e) {
      if (e instanceof AttachmentUnavailable) return { ok: false, reason: "photo_unavailable" };
      if (isUnique(e) && attempt < 3) continue; // slug collision with a concurrent submission
      throw e;
    }
  }
}

async function submitTx(tx: TransactionSql, i: { userId: string; id: string }): Promise<SubmitResult> {
  const row = await loadRow(tx, i.userId, i.id, true);
  if (!row) return { ok: false, reason: "not_found" };
  if (row.status === "submitted" || row.status === "approved") {
    const [t] = await tx`select slug from trail where id = ${row.trail_id}`;
    return t ? { ok: true, slug: t.slug as string } : { ok: false, reason: "not_found" };
  }
  if (!EDITABLE.includes(row.status)) return { ok: false, reason: "locked" };

  const { validated, drafts } = splitData(row.data);
  // Input typed but never saved with "continue" must not be silently left out of the submission.
  const unsaved = (Object.keys(drafts) as string[]).flatMap((k) => (STEPS.filter((s) => STEP_KEYS[s] === k)));
  if (unsaved.length > 0) return { ok: false, reason: "invalid", steps: [...new Set(unsaved)].sort() as Step[] };
  if (row.trail_id && row.revision_id) {
    const [live] = await tx`select 1 from trail where id = ${row.trail_id} and published_revision_id = ${row.revision_id}`;
    if (live) return { ok: false, reason: "locked" };
  }
  const all = validateAll(validated);
  if (!all.ok) return { ok: false, reason: "invalid", steps: all.steps };
  const d = all.value;

  const [state] = await tx`select id from region where kind = 'state' and slug = ${d.basics.state}`;
  if (!state) return { ok: false, reason: "invalid", steps: [1] };

  const [limit] = await tx`select rate_limit_hit(${`submit:${i.userId}`}, ${SUBMISSIONS_PER_DAY}, 86400) as ok`;
  if (!limit!.ok) return { ok: false, reason: "rate_limited" };

  const [user] = await tx`select display_name from app_user where id = ${i.userId}`;
  const [route] = row.route_upload_id
    ? await tx`select r.id, r.distance_km, r.elev_gain_m, r.revision_id from upload u join route r on r.id = u.route_id where u.id = ${row.route_upload_id} and u.user_id = ${i.userId}`
    : [];

  let trailId = row.trail_id;
  let slug: string;
  let versionNo = 1;
  if (trailId) {
    const [t] = await tx`select slug from trail where id = ${trailId}`;
    slug = t!.slug as string;
    const [v] = await tx`select coalesce(max(version_no), 0) + 1 as next from trail_revision where trail_id = ${trailId}`;
    versionNo = v!.next as number;
  } else {
    const base = slugify(d.basics.name).slice(0, 70).replace(/-+$/, "") || "trail";
    const taken = new Set((await tx`select slug from trail where slug = ${base} or slug like ${`${base}-%`}`).map((r) => r.slug as string));
    slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    // The district is resolved by a moderator at approval; until then the trail sits at state level.
    const [t] = await tx`
      insert into trail (slug, region_id, state_id, lifecycle) values (${slug}, ${state.id}, ${state.id}, 'in_review') returning id`;
    trailId = t!.id as string;
  }

  const point = tx`ST_SetSRID(ST_MakePoint(${d.route.startPoint.lon}, ${d.route.startPoint.lat}), 4326)::geography`;
  const [rev] = await tx`
    insert into trail_revision (trail_id, version_no, state, name, summary, description, nearest_town, start_point, route_shape,
      distance_km, elevation_gain_m, difficulty, terrain, suitable_for, best_months, season_notes, hazards, safety_notes, surface_notes, contributor_credit)
    values (${trailId}, ${versionNo}, 'submitted', ${d.basics.name}, ${d.basics.summary}, ${d.details.description ?? null}, ${d.basics.nearestTown},
      ${point}, ${d.route.routeShape}, ${route ? Number(Number(route.distance_km).toFixed(1)) : null}, ${route?.elev_gain_m ?? null},
      ${d.details.difficulty}, ${d.details.terrain}, ${d.details.suitableFor}, ${d.details.bestMonths}, ${d.details.seasonNotes ?? null},
      ${d.details.hazards}, ${d.review.safetyNotes ?? null}, ${d.details.surfaceNotes ?? null}, ${(user?.display_name as string | undefined) ?? null})
    returning id`;
  const revisionId = rev!.id as string;
  if (row.revision_id) await tx`update trail_revision set state = 'superseded' where id = ${row.revision_id}`;

  const [assessment] = await tx`
    insert into access_assessment (trail_id, access_class, restrictions, permission_instructions, permission_contact, basis, level)
    values (${trailId}, ${d.access.accessClass}, ${d.access.restrictions}, ${d.access.permissionInstructions ?? null},
      ${d.access.permissionContact ?? null}, ${d.access.basis}, ${d.access.level})
    returning id`;
  for (const e of d.access.evidence) {
    await tx`insert into evidence (assessment_id, kind, description, url) values (${assessment!.id}, ${e.kind}, ${e.description}, ${e.url ?? null})`;
  }

  if (route) {
    const moved = await tx`update route set revision_id = ${revisionId} where id = ${route.id} and (revision_id is null or revision_id = ${row.revision_id}) returning id`;
    if (moved.length === 0) throw new AttachmentUnavailable(); // the route was attached elsewhere; treat as unavailable media
  }
  for (const [position, p] of d.photos.entries()) {
    const done = await tx`
      update media set revision_id = ${revisionId}, role = ${position === 0 ? "cover" : "gallery"}, position = ${position}, caption = ${p.caption ?? null},
        alt_text = ${p.altText}, credit = ${p.credit ?? (user?.display_name as string | undefined) ?? null}
      where id = ${p.mediaId} and uploaded_by = ${i.userId} and (revision_id is null or revision_id = ${row.revision_id})
      returning id`;
    if (done.length !== 1) throw new AttachmentUnavailable();
  }

  await tx`update trail set updated_at = now() where id = ${trailId}`;
  await tx`
    update submission set status = 'submitted', trail_id = ${trailId}, revision_id = ${revisionId}, submitted_at = now(), first_approver = null, first_approved_at = null,
      contributor_note = ${d.review.contributorNote ?? null}, updated_at = now() where id = ${row.id}`;
  return { ok: true, slug };
}
