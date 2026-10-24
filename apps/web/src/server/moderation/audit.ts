import type { Sql, TransactionSql } from "postgres";
import type { Actor } from "./actor";

/** Writes the audit entry for an action. Always called inside the transaction that performs the action. */
export async function audit(
  tx: Sql | TransactionSql,
  actor: Actor,
  e: { action: string; entityType: string; entityId: string; before?: unknown; after?: unknown },
): Promise<void> {
  await tx`
    insert into audit_log (actor_id, actor_role, action, entity_type, entity_id, before, after)
    values (${actor.id}, ${actor.role}, ${e.action}, ${e.entityType}, ${e.entityId},
      ${e.before === undefined ? null : tx.json(e.before as never)}, ${e.after === undefined ? null : tx.json(e.after as never)})`;
}

export async function record(
  tx: Sql | TransactionSql,
  r: { subjectType: "revision" | "report" | "media" | "gpx" | "user"; subjectId: string; moderatorId: string; action: string; reasonCode?: string | null; comment?: string | null; fieldComments?: Record<string, string>; visibleToAuthor?: boolean },
): Promise<void> {
  await tx`
    insert into moderation_record (subject_type, subject_id, moderator_id, action, reason_code, comment, field_comments, visible_to_author)
    values (${r.subjectType}, ${r.subjectId}, ${r.moderatorId}, ${r.action}, ${r.reasonCode ?? null}, ${r.comment ?? null},
      ${tx.json((r.fieldComments ?? {}) as never)}, ${r.visibleToAuthor ?? false})`;
}
