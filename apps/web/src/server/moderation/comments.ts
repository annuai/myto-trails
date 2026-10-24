import type { Sql } from "postgres";
import { FORBIDDEN, getActor } from "./actor";
import { audit } from "./audit";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CommentQueueItem = {
  commentId: string; trailSlug: string; trailName: string; authorName: string; body: string; status: string; createdAt: string;
  reports: { reason: string; createdAt: string }[];
};

/** Comments waiting for approval and visible comments that riders have reported. Reporter names are never shown. */
export async function listCommentQueue(sql: Sql, actorId: string): Promise<{ ok: true; items: CommentQueueItem[] } | typeof FORBIDDEN> {
  if (!(await getActor(sql, actorId))) return FORBIDDEN;
  const rows = await sql`
    select c.id, c.body, c.status, c.created_at, t.slug, coalesce(rev.name, t.slug) as trail_name, u.display_name,
      coalesce((select json_agg(json_build_object('reason', r.reason, 'createdAt', r.created_at) order by r.created_at)
        from content_report r where r.subject_type = 'comment' and r.subject_id = c.id and r.status = 'open'), '[]'::json) as reports
    from trail_comment c
    join trail t on t.id = c.trail_id
    left join trail_revision rev on rev.id = t.published_revision_id
    join app_user u on u.id = c.user_id
    where c.deleted_at is null and (c.status = 'pending' or (c.status = 'visible' and exists (select 1 from content_report r where r.subject_type = 'comment' and r.subject_id = c.id and r.status = 'open')))
    order by (c.status = 'visible') desc, c.created_at asc limit 200`;
  return {
    ok: true,
    items: rows.map((r) => ({ commentId: r.id, trailSlug: r.slug, trailName: r.trail_name, authorName: r.display_name, body: r.body, status: r.status, createdAt: (r.created_at as Date).toISOString(), reports: r.reports })),
  };
}

export type CommentAction = "approve" | "hide" | "restore" | "dismiss";

/** Approve, hide (with a reason), restore, or dismiss the reports on a comment. Every action is audited. */
export async function moderateComment(
  sql: Sql,
  i: { actorId: string; commentId: string; action: CommentAction; reason?: string },
): Promise<{ ok: true; trailSlug: string } | { ok: false; reason: "forbidden" | "not_found" | "invalid" | "wrong_state" }> {
  return sql.begin(async (tx) => {
    const actor = await getActor(tx, i.actorId);
    if (!actor) return FORBIDDEN;
    if (!UUID.test(i.commentId)) return { ok: false, reason: "not_found" } as const;
    const reason = String(i.reason ?? "").trim().slice(0, 500);
    if (i.action === "hide" && reason.length < 3) return { ok: false, reason: "invalid" } as const;
    const [c] = await tx`select c.id, c.status, t.slug from trail_comment c join trail t on t.id = c.trail_id where c.id = ${i.commentId} and c.deleted_at is null for update of c`;
    if (!c) return { ok: false, reason: "not_found" } as const;

    let next: string = c.status;
    if (i.action === "approve") {
      if (c.status !== "pending") return { ok: false, reason: "wrong_state" } as const;
      next = "visible";
    } else if (i.action === "hide") {
      if (c.status === "hidden") return { ok: false, reason: "wrong_state" } as const;
      next = "hidden";
    } else if (i.action === "restore") {
      if (c.status !== "hidden") return { ok: false, reason: "wrong_state" } as const;
      next = "visible";
    } else if (i.action !== "dismiss") {
      return { ok: false, reason: "invalid" } as const;
    }

    await tx`update trail_comment set status = ${next}, hidden_reason = ${next === "hidden" ? reason : null} where id = ${c.id}`;
    // Hiding or dismissing settles the open reports on this comment.
    if (i.action === "hide" || i.action === "dismiss") {
      await tx`update content_report set status = 'resolved', resolved_by = ${actor.id}, resolved_at = now() where subject_type = 'comment' and subject_id = ${c.id} and status = 'open'`;
    }
    await audit(tx, actor, { action: `comment_${i.action}`, entityType: "comment", entityId: c.id, before: { status: c.status }, after: { status: next, reason: reason || undefined } });
    return { ok: true, trailSlug: c.slug as string } as const;
  });
}

export type QuestionReportItem = { reportId: string; questionId: string; askerName: string; question: string; reason: string; createdAt: string };

/** Reported questions between riders. A moderator sees the question the reporter chose to report, nothing else of the exchange. */
export async function listQuestionReports(sql: Sql, actorId: string): Promise<{ ok: true; items: QuestionReportItem[] } | typeof FORBIDDEN> {
  if (!(await getActor(sql, actorId))) return FORBIDDEN;
  const rows = await sql`
    select r.id as report_id, q.id as question_id, u.display_name, q.question, r.reason, r.created_at
    from content_report r join rider_question q on q.id = r.subject_id join app_user u on u.id = q.asker_id
    where r.subject_type = 'question' and r.status = 'open' order by r.created_at asc limit 100`;
  return { ok: true, items: rows.map((r) => ({ reportId: r.report_id, questionId: r.question_id, askerName: r.display_name, question: r.question, reason: r.reason, createdAt: (r.created_at as Date).toISOString() })) };
}

export async function dismissQuestionReport(sql: Sql, i: { actorId: string; reportId: string }): Promise<{ ok: true } | { ok: false; reason: "forbidden" | "not_found" }> {
  return sql.begin(async (tx) => {
    const actor = await getActor(tx, i.actorId);
    if (!actor) return FORBIDDEN;
    if (!UUID.test(i.reportId)) return { ok: false, reason: "not_found" } as const;
    const rows = await tx`update content_report set status = 'resolved', resolved_by = ${actor.id}, resolved_at = now() where id = ${i.reportId} and subject_type = 'question' and status = 'open' returning subject_id`;
    if (!rows.length) return { ok: false, reason: "not_found" } as const;
    await audit(tx, actor, { action: "question_report_resolved", entityType: "question", entityId: rows[0]!.subject_id as string });
    return { ok: true } as const;
  });
}
