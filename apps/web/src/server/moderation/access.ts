import { CONDITION_REASONS, OPERATIONAL_STATUSES, type EvidenceKind } from "@moto-trails/domain";
import type { Sql, TransactionSql } from "postgres";
import { FORBIDDEN, getActor, type Actor } from "./actor";
import { audit, record } from "./audit";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const OFFICIAL_KINDS: EvidenceKind[] = ["official_document", "written_confirmation"];

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const addMonths = (d: Date, n: number) => {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate()));
  return isoDate(x);
};

type Fail<R extends string = never> = { ok: false; reason: "forbidden" | "not_found" | "invalid" | "wrong_state" | R };

/** The revision that audit and decision records attach to: the published one, else the newest. */
async function auditRevision(tx: Sql | TransactionSql, trailId: string): Promise<string | null> {
  const [r] = await tx`select coalesce(t.published_revision_id, (select id from trail_revision where trail_id = t.id order by version_no desc limit 1)) as id from trail t where t.id = ${trailId}`;
  return (r?.id as string | undefined) ?? null;
}

export type EvidenceInput = { kind: EvidenceKind; description: string; url?: string };

export async function verifyAccess(
  sql: Sql,
  i: { actorId: string; trailId: string; level: "moderator_verified" | "officially_verified"; evidence?: EvidenceInput[]; authority?: string; validUntil?: string; note?: string; now: Date },
): Promise<{ ok: true; validUntil: string } | Fail<"evidence_required" | "authority_required">> {
  return sql.begin(async (tx) => {
    const actor = await getActor(tx, i.actorId);
    if (!actor) return FORBIDDEN;
    if (!UUID.test(i.trailId)) return { ok: false, reason: "not_found" } as const;
    if (i.level !== "moderator_verified" && i.level !== "officially_verified") return { ok: false, reason: "invalid" } as const;
    const [t] = await tx`select t.id, t.condition_current from trail t where t.id = ${i.trailId} for update`;
    if (!t) return { ok: false, reason: "not_found" } as const;
    const [a] = await tx`select id, access_class, restrictions, permission_instructions, permission_contact, basis from access_assessment where trail_id = ${i.trailId} order by created_at desc, id desc limit 1`;
    if (!a) return { ok: false, reason: "invalid" } as const;

    const newEvidence = (i.evidence ?? []).filter((e) => e.description?.trim()).slice(0, 10).map((e) => ({ kind: e.kind, description: e.description.trim().slice(0, 500), url: e.url?.trim() || null }));
    const existing = await tx`select kind, description, url from evidence where assessment_id = ${a.id}`;
    const all = [...existing.map((e) => ({ kind: e.kind as EvidenceKind, description: e.description as string, url: (e.url as string | null) ?? null })), ...newEvidence];
    if (all.length === 0) return { ok: false, reason: "evidence_required" } as const;
    if (i.level === "officially_verified") {
      if (!all.some((e) => OFFICIAL_KINDS.includes(e.kind))) return { ok: false, reason: "evidence_required" } as const;
      if (!i.authority?.trim()) return { ok: false, reason: "authority_required" } as const;
    }

    const today = isoDate(i.now);
    const months = a.access_class === "permission_required" ? 3 : t.condition_current === "seasonal" ? 6 : 12;
    let validUntil = addMonths(i.now, months);
    if (i.validUntil !== undefined) {
      if (!DATE.test(i.validUntil) || i.validUntil <= today || i.validUntil > addMonths(i.now, 24)) return { ok: false, reason: "invalid" } as const;
      validUntil = i.validUntil;
    }

    const notes = [i.authority ? `Authority: ${i.authority.trim()}` : null, i.note?.trim() || null].filter(Boolean).join(" | ").slice(0, 1000) || null;
    const [created] = await tx`
      insert into access_assessment (trail_id, access_class, restrictions, permission_instructions, permission_contact, basis, level, verified_at, valid_until, notes)
      values (${i.trailId}, ${a.access_class}, ${a.restrictions}, ${a.permission_instructions}, ${a.permission_contact}, ${a.basis}, ${i.level}, ${today}, ${validUntil}, ${notes})
      returning id`;
    for (const e of all) await tx`insert into evidence (assessment_id, kind, description, url) values (${created!.id}, ${e.kind}, ${e.description}, ${e.url})`;

    const rev = await auditRevision(tx, i.trailId);
    if (rev) {
      await record(tx, { subjectType: "revision", subjectId: rev, moderatorId: actor.id, action: "verify_access", comment: notes });
      await audit(tx, actor, { action: "verify_access", entityType: "revision", entityId: rev, before: { level: "previous" }, after: { level: i.level, validUntil } });
    }
    return { ok: true, validUntil } as const;
  });
}

export async function unpublish(sql: Sql, i: { actorId: string; trailId: string; reason: string }): Promise<{ ok: true; slug: string } | Fail> {
  return sql.begin(async (tx) => {
    const actor = await getActor(tx, i.actorId);
    if (!actor) return FORBIDDEN;
    if (!UUID.test(i.trailId)) return { ok: false, reason: "not_found" } as const;
    const reason = String(i.reason ?? "").trim().slice(0, 1000);
    if (!reason) return { ok: false, reason: "invalid" } as const;
    const [t] = await tx`select id, slug, lifecycle, published_revision_id from trail where id = ${i.trailId} for update`;
    if (!t) return { ok: false, reason: "not_found" } as const;
    if (t.lifecycle !== "published") return { ok: false, reason: "wrong_state" } as const;
    await tx`update trail set lifecycle = 'unpublished', updated_at = now() where id = ${t.id}`;
    const rev = (t.published_revision_id as string | null) ?? (await auditRevision(tx, i.trailId));
    if (rev) {
      await record(tx, { subjectType: "revision", subjectId: rev, moderatorId: actor.id, action: "unpublish", comment: reason });
      await audit(tx, actor, { action: "unpublish", entityType: "revision", entityId: rev, before: { lifecycle: "published" }, after: { lifecycle: "unpublished", reason } });
    }
    return { ok: true, slug: t.slug as string } as const;
  });
}

export type ConditionInput = { status: (typeof OPERATIONAL_STATUSES)[number]; reason?: (typeof CONDITION_REASONS)[number]; expectedUntil?: string; note?: string };

/** Validates and inserts a condition event inside an open transaction. Returns false when the input is invalid. */
export async function insertCondition(tx: TransactionSql, trailId: string, c: ConditionInput, source: "moderator" | "report", now: Date): Promise<boolean> {
  if (!(OPERATIONAL_STATUSES as readonly string[]).includes(c.status)) return false;
  if (c.reason !== undefined && !(CONDITION_REASONS as readonly string[]).includes(c.reason)) return false;
  const today = isoDate(now);
  if (c.expectedUntil !== undefined && (!DATE.test(c.expectedUntil) || c.expectedUntil <= today)) return false;
  await tx`
    insert into condition_event (trail_id, status, reason, effective_from, expected_until, note, source)
    values (${trailId}, ${c.status}, ${c.reason ?? null}, ${today}, ${c.expectedUntil ?? null}, ${c.note?.trim().slice(0, 500) || null}, ${source})`;
  return true;
}

export async function setCondition(sql: Sql, i: { actorId: string; trailId: string; now: Date } & ConditionInput): Promise<{ ok: true; slug: string } | Fail> {
  return sql.begin(async (tx) => {
    const actor = await getActor(tx, i.actorId);
    if (!actor) return FORBIDDEN;
    if (!UUID.test(i.trailId)) return { ok: false, reason: "not_found" } as const;
    const [t] = await tx`select slug from trail where id = ${i.trailId} for update`;
    if (!t) return { ok: false, reason: "not_found" } as const;
    if (!(await insertCondition(tx, i.trailId, i, "moderator", i.now))) return { ok: false, reason: "invalid" } as const;
    await auditCondition(tx, actor, i.trailId, i.status);
    return { ok: true, slug: t.slug as string } as const;
  });
}

export async function auditCondition(tx: TransactionSql, actor: Actor, trailId: string, status: string): Promise<void> {
  const rev = await auditRevision(tx, trailId);
  if (!rev) return;
  await record(tx, { subjectType: "revision", subjectId: rev, moderatorId: actor.id, action: "set_condition", comment: status });
  await audit(tx, actor, { action: "set_condition", entityType: "revision", entityId: rev, after: { status } });
}

export type DueItem = { slug: string; name: string; accessClass: string; level: string; validUntil: string; overdue: boolean };

/** Published trails whose verified access expires within `withinDays` or has already lapsed, soonest first. */
export async function listDueForRecheck(sql: Sql, actorId: string, now: Date, withinDays = 30): Promise<{ ok: true; items: DueItem[] } | typeof FORBIDDEN> {
  if (!(await getActor(sql, actorId))) return FORBIDDEN;
  const today = isoDate(now);
  const horizon = isoDate(new Date(now.getTime() + withinDays * 86_400_000));
  const rows = await sql`
    select t.slug, rev.name, t.access_class_current as access_class, t.access_verification_level_current as level, t.access_verified_until::text as valid_until
    from trail t join trail_revision rev on rev.id = t.published_revision_id
    where t.lifecycle = 'published' and t.access_verified_until is not null and t.access_verified_until <= ${horizon}
      and t.access_verification_level_current in ('moderator_verified', 'officially_verified')
    order by t.access_verified_until asc, t.slug limit 500`;
  return { ok: true, items: rows.map((r) => ({ slug: r.slug, name: r.name, accessClass: r.access_class, level: r.level, validUntil: r.valid_until, overdue: r.valid_until <= today })) };
}
