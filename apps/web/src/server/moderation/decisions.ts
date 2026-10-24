import type { Sql, TransactionSql } from "postgres";
import { ensureDistrict } from "../db/regions";
import { STEP_KEYS, type SubmissionData } from "../submissions/schema";
import { FORBIDDEN, getActor, type Actor } from "./actor";
import { audit, record } from "./audit";

export const REASON_CODES = ["duplicate", "insufficient_information", "unverifiable_access", "private_property", "protected_area_risk", "unsafe_content", "inaccurate_gpx", "copyright", "spam"] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const needsSecondApproval = (accessClass: string, restrictions: string[]) => accessClass === "restricted" || restrictions.includes("protected_area");

export type Notify = { contributorId: string; outcome: "approved" | "changes_requested" | "rejected"; title: string; comment?: string; slug?: string };
type Fail = { ok: false; reason: "forbidden" | "not_found" | "invalid" | "own_submission" | "wrong_state" | "cannot_publish" | "same_approver" };

type Locked = { actor: Actor; sub: { id: string; user_id: string; status: string; trail_id: string; revision_id: string; data: Partial<SubmissionData>; first_approver: string | null }; title: string };

/** Role check, then the submission row locked and checked: the common start of every decision. */
async function lockForDecision(tx: TransactionSql, actorId: string, submissionId: string): Promise<Locked | Fail> {
  const actor = await getActor(tx, actorId);
  if (!actor) return FORBIDDEN;
  if (!UUID.test(submissionId)) return { ok: false, reason: "not_found" };
  const [sub] = await tx`select id, user_id, status, trail_id, revision_id, data, first_approver from submission where id = ${submissionId} for update`;
  if (!sub || !sub.revision_id) return { ok: false, reason: "not_found" };
  if (sub.user_id === actor.id) return { ok: false, reason: "own_submission" };
  if (sub.status !== "submitted") return { ok: false, reason: "wrong_state" };
  const data = sub.data as Partial<SubmissionData>;
  return { actor, sub: sub as Locked["sub"], title: data.basics?.name ?? "your trail" };
}
const isFail = (v: Locked | Fail): v is Fail => "ok" in v;

// ---- queue and review --------------------------------------------------------------------------------------

export type QueueItem = {
  submissionId: string; title: string; state: string; accessClass: string; restrictions: string[];
  submittedAt: string; version: number; needsSecondApproval: boolean; awaitingSecond: boolean;
};

export async function listQueue(sql: Sql, actorId: string): Promise<{ ok: true; items: QueueItem[] } | typeof FORBIDDEN> {
  if (!(await getActor(sql, actorId))) return FORBIDDEN;
  const rows = await sql`
    select s.id, s.submitted_at, s.first_approver, rev.name, rev.version_no, st.name as state_name, a.access_class, a.restrictions
    from submission s
    join trail t on t.id = s.trail_id
    join trail_revision rev on rev.id = s.revision_id
    join region st on st.id = t.state_id
    left join lateral (select access_class, restrictions from access_assessment where trail_id = t.id order by created_at desc, id desc limit 1) a on true
    where s.status = 'submitted'
    order by s.submitted_at asc limit 200`;
  return {
    ok: true,
    items: rows.map((r) => ({
      submissionId: r.id, title: r.name, state: r.state_name, accessClass: r.access_class ?? "unknown", restrictions: r.restrictions ?? [],
      submittedAt: (r.submitted_at as Date).toISOString(), version: r.version_no,
      needsSecondApproval: needsSecondApproval(r.access_class ?? "unknown", r.restrictions ?? []), awaitingSecond: r.first_approver !== null,
    })),
  };
}

export type Review = {
  submissionId: string; title: string; status: string; version: number; contributorName: string; submittedAt: string | null;
  data: Partial<SubmissionData>; duplicates: unknown[]; contributorNote: string | null; needsSecondApproval: boolean; firstApproverName: string | null; trailSlug: string;
  access: { accessClass: string; restrictions: string[]; permissionInstructions: string | null; permissionContact: string | null; basis: string; level: string; evidence: { kind: string; description: string; url: string | null }[] };
  route: { distanceKm: number; elevGainM: number | null; pointCount: number; line: [number, number][]; profile: { d: number; e: number }[] | null } | null;
  photos: { url: string; altText: string; caption: string | null; credit: string | null; role: string }[];
  history: { action: string; reasonCode: string | null; comment: string | null; createdAt: string }[];
};

/** Everything a moderator needs to review one submission. Contributor email is deliberately not included. */
export async function getReview(sql: Sql, actorId: string, submissionId: string): Promise<{ ok: true; review: Review } | typeof FORBIDDEN | { ok: false; reason: "not_found" }> {
  if (!(await getActor(sql, actorId))) return FORBIDDEN;
  if (!UUID.test(submissionId)) return { ok: false, reason: "not_found" };
  const [s] = await sql`
    select s.id, s.status, s.data, s.duplicate_candidates, s.contributor_note, s.submitted_at, s.revision_id, s.trail_id, s.first_approver,
      rev.name, rev.version_no, t.slug, u.display_name, fa.display_name as first_name
    from submission s
    join trail t on t.id = s.trail_id join trail_revision rev on rev.id = s.revision_id
    join app_user u on u.id = s.user_id left join app_user fa on fa.id = s.first_approver
    where s.id = ${submissionId}`;
  if (!s) return { ok: false, reason: "not_found" };
  const [a] = await sql`select id, access_class, restrictions, permission_instructions, permission_contact, basis, level from access_assessment where trail_id = ${s.trail_id} order by created_at desc, id desc limit 1`;
  const evidence = a ? await sql`select kind, description, url from evidence where assessment_id = ${a.id}` : [];
  const [r] = await sql`select distance_km, elev_gain_m, point_count, profile, st_asgeojson(simplified, 5) as line from route where revision_id = ${s.revision_id}`;
  const photos = await sql`select variants, alt_text, caption, credit, role from media where revision_id = ${s.revision_id} order by position`;
  const history = await sql`select action, reason_code, comment, created_at from moderation_record where subject_type = 'revision' and subject_id = ${s.revision_id} order by created_at`;
  const accessClass = (a?.access_class as string | undefined) ?? "unknown";
  const restrictions = (a?.restrictions as string[] | undefined) ?? [];
  return {
    ok: true,
    review: {
      submissionId: s.id, title: s.name, status: s.status, version: s.version_no, contributorName: s.display_name, submittedAt: s.submitted_at ? (s.submitted_at as Date).toISOString() : null,
      data: s.data, duplicates: s.duplicate_candidates, contributorNote: s.contributor_note, needsSecondApproval: needsSecondApproval(accessClass, restrictions),
      firstApproverName: s.first_name ?? null, trailSlug: s.slug,
      access: { accessClass, restrictions, permissionInstructions: a?.permission_instructions ?? null, permissionContact: a?.permission_contact ?? null, basis: a?.basis ?? "none", level: a?.level ?? "unverified",
        evidence: evidence.map((e) => ({ kind: e.kind, description: e.description, url: e.url ?? null })) },
      route: r ? { distanceKm: Number(r.distance_km), elevGainM: r.elev_gain_m, pointCount: r.point_count, profile: r.profile ?? null, line: (JSON.parse(r.line) as { coordinates: [number, number][] }).coordinates } : null,
      photos: photos.map((p) => ({ url: (p.variants as Record<string, string>)["800"] ?? Object.values(p.variants as Record<string, string>)[0] ?? "", altText: p.alt_text, caption: p.caption, credit: p.credit, role: p.role })),
      history: history.map((h) => ({ action: h.action, reasonCode: h.reason_code, comment: h.comment, createdAt: (h.created_at as Date).toISOString() })),
    },
  };
}

// ---- decisions ---------------------------------------------------------------------------------------------

type DecisionResult = ({ ok: true; notify: Notify } & Record<string, unknown>) | Fail;

export async function requestChanges(sql: Sql, i: { actorId: string; submissionId: string; comment: string; fieldComments?: Record<string, string> }): Promise<DecisionResult> {
  return sql.begin(async (tx): Promise<DecisionResult> => {
    const l = await lockForDecision(tx, i.actorId, i.submissionId);
    if (isFail(l)) return l;
    const comment = String(i.comment ?? "").trim();
    const stepKeys: string[] = Object.values(STEP_KEYS);
    const fields = Object.entries(i.fieldComments ?? {}).filter(([k, v]) => stepKeys.includes(k) && typeof v === "string" && v.trim()).slice(0, 10).map(([k, v]) => [k, v.trim().slice(0, 500)] as const);
    if (comment.length < 10 || comment.length > 4000) return { ok: false, reason: "invalid" };

    await tx`update submission set status = 'changes_requested', moderator_feedback = ${comment}, decided_by = ${l.actor.id}, decided_at = now(), updated_at = now() where id = ${l.sub.id}`;
    await tx`update trail_revision set state = 'changes_requested' where id = ${l.sub.revision_id}`;
    await record(tx, { subjectType: "revision", subjectId: l.sub.revision_id, moderatorId: l.actor.id, action: "request_changes", comment, fieldComments: Object.fromEntries(fields), visibleToAuthor: true });
    await audit(tx, l.actor, { action: "request_changes", entityType: "revision", entityId: l.sub.revision_id, before: { status: "submitted" }, after: { status: "changes_requested" } });
    return { ok: true, notify: { contributorId: l.sub.user_id, outcome: "changes_requested", title: l.title, comment } };
  });
}

export async function rejectSubmission(sql: Sql, i: { actorId: string; submissionId: string; reasonCode: ReasonCode; comment: string }): Promise<DecisionResult> {
  return sql.begin(async (tx): Promise<DecisionResult> => {
    const l = await lockForDecision(tx, i.actorId, i.submissionId);
    if (isFail(l)) return l;
    if (!(REASON_CODES as readonly string[]).includes(i.reasonCode)) return { ok: false, reason: "invalid" };
    const comment = String(i.comment ?? "").trim().slice(0, 4000);

    await tx`update submission set status = 'rejected', moderator_feedback = ${comment || i.reasonCode.replaceAll("_", " ")}, decided_by = ${l.actor.id}, decided_at = now(), updated_at = now() where id = ${l.sub.id}`;
    await tx`update trail_revision set state = 'rejected', decided_at = now() where id = ${l.sub.revision_id}`;
    await tx`update trail set lifecycle = 'archived', updated_at = now() where id = ${l.sub.trail_id} and lifecycle <> 'published'`;
    await record(tx, { subjectType: "revision", subjectId: l.sub.revision_id, moderatorId: l.actor.id, action: "reject", reasonCode: i.reasonCode, comment, visibleToAuthor: true });
    await audit(tx, l.actor, { action: "reject", entityType: "revision", entityId: l.sub.revision_id, before: { status: "submitted" }, after: { status: "rejected", reason: i.reasonCode } });
    return { ok: true, notify: { contributorId: l.sub.user_id, outcome: "rejected", title: l.title, comment: comment || undefined } };
  });
}

export type ApproveInput = { actorId: string; submissionId: string; sensitivity: "standard" | "sensitive" | "restricted_geometry"; publicPoint?: { lat: number; lon: number }; publishGpx?: boolean };

/** Approves a submission. Restricted or protected-area trails need two different approvers; the second one publishes. */
export async function approve(sql: Sql, i: ApproveInput): Promise<DecisionResult> {
  return sql.begin(async (tx): Promise<DecisionResult> => {
    const l = await lockForDecision(tx, i.actorId, i.submissionId);
    if (isFail(l)) return l;
    const point = i.publicPoint;
    const pointOk = point && Number.isFinite(point.lat) && Number.isFinite(point.lon) && point.lat >= 6 && point.lat <= 37 && point.lon >= 68 && point.lon <= 98;
    if (!["standard", "sensitive", "restricted_geometry"].includes(i.sensitivity) || (i.sensitivity !== "standard" && !pointOk)) return { ok: false, reason: "invalid" };

    const [a] = await tx`select access_class, restrictions from access_assessment where trail_id = ${l.sub.trail_id} order by created_at desc, id desc limit 1`;
    const accessClass = (a?.access_class as string | undefined) ?? "unknown";
    if (accessClass === "private_no_access") return { ok: false, reason: "cannot_publish" };

    if (needsSecondApproval(accessClass, (a?.restrictions as string[] | undefined) ?? [])) {
      if (l.sub.first_approver === null) {
        await tx`update submission set first_approver = ${l.actor.id}, first_approved_at = now(), updated_at = now() where id = ${l.sub.id}`;
        await record(tx, { subjectType: "revision", subjectId: l.sub.revision_id, moderatorId: l.actor.id, action: "approve", comment: "First approval; a second moderator must approve before publication." });
        await audit(tx, l.actor, { action: "approve", entityType: "revision", entityId: l.sub.revision_id, before: { status: "submitted" }, after: { status: "submitted", firstApproval: true } });
        return { ok: true, published: false, awaitingSecond: true, notify: { contributorId: l.sub.user_id, outcome: "approved", title: l.title } };
      }
      if (l.sub.first_approver === l.actor.id) return { ok: false, reason: "same_approver" };
    }

    const basics = l.sub.data.basics;
    if (!basics) return { ok: false, reason: "invalid" };
    const district = await ensureDistrict(tx as unknown as Sql, basics.state, basics.district);
    const publicPoint = i.sensitivity === "standard" || !point ? null : tx`ST_SetSRID(ST_MakePoint(${point.lon}, ${point.lat}), 4326)::geography`;
    const [t] = await tx`
      update trail set lifecycle = 'published', published_revision_id = ${l.sub.revision_id}, first_published_at = coalesce(first_published_at, now()),
        region_id = ${district.id}, sensitivity = ${i.sensitivity}, public_point = ${publicPoint}, updated_at = now()
      where id = ${l.sub.trail_id} returning slug`;
    await tx`update trail_revision set state = 'approved', decided_at = now() where id = ${l.sub.revision_id}`;
    const withoutGpx = i.publishGpx === false;
    if (withoutGpx) await tx`update gpx_file set status = 'retired' where route_id in (select id from route where revision_id = ${l.sub.revision_id})`;
    await tx`update submission set status = 'approved', decided_by = ${l.actor.id}, decided_at = now(), updated_at = now() where id = ${l.sub.id}`;
    await record(tx, { subjectType: "revision", subjectId: l.sub.revision_id, moderatorId: l.actor.id, action: withoutGpx ? "publish_limited" : "approve", comment: "Published", visibleToAuthor: true });
    await audit(tx, l.actor, { action: "approve", entityType: "revision", entityId: l.sub.revision_id, before: { status: "submitted" }, after: { status: "approved", sensitivity: i.sensitivity, gpx: !withoutGpx } });
    return { ok: true, published: true, slug: t!.slug as string, notify: { contributorId: l.sub.user_id, outcome: "approved", title: l.title, slug: t!.slug as string } };
  });
}
