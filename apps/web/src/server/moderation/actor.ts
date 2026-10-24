import type { Sql, TransactionSql } from "postgres";

export type Actor = { id: string; role: "moderator" | "admin" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The user's moderation role, or null for riders, unknown ids and suspended or deleted accounts. */
export async function getActor(sql: Sql | TransactionSql, userId: string): Promise<Actor | null> {
  if (!UUID.test(userId)) return null;
  const rows = await sql`
    select r.role from user_role r join app_user u on u.id = r.user_id
    where r.user_id = ${userId} and u.status = 'active'`;
  if (rows.length === 0) return null;
  return { id: userId, role: rows.some((r) => r.role === "admin") ? "admin" : "moderator" };
}

export const FORBIDDEN = { ok: false, reason: "forbidden" } as const;
