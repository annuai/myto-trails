import type { Sql } from "postgres";
import { FORBIDDEN, getActor } from "./actor";
import { audit, record } from "./audit";
import { auditCondition, insertCondition, type ConditionInput } from "./access";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OUTCOMES = { accepted: "accepted", rejected: "rejected", needs_info: "needs_info", duplicate: "duplicate_of_report" } as const;
export type ReportOutcome = keyof typeof OUTCOMES;

export type ReportItem = { reportId: string; trailSlug: string; trailName: string; type: string; details: string; priority: string; status: string; reporterName: string; createdAt: string };

export async function listReports(sql: Sql, actorId: string): Promise<{ ok: true; items: ReportItem[] } | typeof FORBIDDEN> {
  if (!(await getActor(sql, actorId))) return FORBIDDEN;
  const rows = await sql`
    select r.id, r.type, r.details, r.priority, r.status, r.created_at, t.slug, coalesce(rev.name, t.slug) as name, u.display_name
    from trail_report r join trail t on t.id = r.trail_id
    left join trail_revision rev on rev.id = coalesce(t.published_revision_id, (select id from trail_revision where trail_id = t.id order by version_no desc limit 1))
    join app_user u on u.id = r.reporter_id
    where r.status in ('open', 'triaged', 'needs_info')
    order by (r.priority = 'high') desc, r.created_at asc limit 200`;
  return { ok: true, items: rows.map((r) => ({ reportId: r.id, trailSlug: r.slug, trailName: r.name, type: r.type, details: r.details, priority: r.priority, status: r.status, reporterName: r.display_name, createdAt: (r.created_at as Date).toISOString() })) };
}

export async function resolveReport(
  sql: Sql,
  i: { actorId: string; reportId: string; outcome: ReportOutcome; note: string; condition?: ConditionInput; now: Date },
): Promise<{ ok: true; trailSlug: string; notify: { reporterId: string; outcome: ReportOutcome; trailName: string; note: string } } | { ok: false; reason: "forbidden" | "not_found" | "invalid" | "wrong_state" }> {
  return sql.begin(async (tx) => {
    const actor = await getActor(tx, i.actorId);
    if (!actor) return FORBIDDEN;
    if (!UUID.test(i.reportId)) return { ok: false, reason: "not_found" } as const;
    if (!(i.outcome in OUTCOMES)) return { ok: false, reason: "invalid" } as const;
    const [r] = await tx`select r.id, r.status, r.type, r.trail_id, r.reporter_id, t.slug, coalesce(rev.name, t.slug) as name
      from trail_report r join trail t on t.id = r.trail_id
      left join trail_revision rev on rev.id = t.published_revision_id where r.id = ${i.reportId} for update of r`;
    if (!r) return { ok: false, reason: "not_found" } as const;
    if (!["open", "triaged", "needs_info"].includes(r.status)) return { ok: false, reason: "wrong_state" } as const;

    if (i.condition && (i.outcome !== "accepted" || r.type !== "closure")) return { ok: false, reason: "invalid" } as const;
    const note = String(i.note ?? "").trim().slice(0, 2000);
    const final = i.outcome !== "needs_info";
    await tx`update trail_report set status = ${OUTCOMES[i.outcome]}, resolution_note = ${note || null},
      resolved_by = ${final ? actor.id : null}, resolved_at = ${final ? tx`now()` : null} where id = ${r.id}`;
    if (i.outcome === "accepted" && i.condition) {
      if (!(await insertCondition(tx, r.trail_id, i.condition, "report", i.now))) throw new InvalidCondition();
      await auditCondition(tx, actor, r.trail_id, i.condition.status);
    }
    await record(tx, { subjectType: "report", subjectId: r.id, moderatorId: actor.id, action: "resolve_report", comment: `${i.outcome}: ${note}`.slice(0, 4000) });
    await audit(tx, actor, { action: "resolve_report", entityType: "report", entityId: r.id, before: { status: r.status }, after: { status: OUTCOMES[i.outcome] } });
    return { ok: true, trailSlug: r.slug as string, notify: { reporterId: r.reporter_id as string, outcome: i.outcome, trailName: r.name as string, note } } as const;
  }).catch((e) => {
    if (e instanceof InvalidCondition) return { ok: false, reason: "invalid" } as const;
    throw e;
  });
}

class InvalidCondition extends Error {}
