import type { Sql, TransactionSql } from "postgres";

export type Actor = {
  id: string;
  role: "moderator" | "admin";
  /** The countries (region ids) this actor may act in. Null means every country: admins. */
  countryIds: string[] | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The user's moderation role, or null for riders, unknown ids and suspended or deleted accounts. */
export async function getActor(sql: Sql | TransactionSql, userId: string): Promise<Actor | null> {
  if (!UUID.test(userId)) return null;
  const rows = await sql`
    select r.role, r.region_id from user_role r join app_user u on u.id = r.user_id
    where r.user_id = ${userId} and u.status = 'active'`;
  if (rows.length === 0) return null;
  if (rows.some((r) => r.role === "admin")) return { id: userId, role: "admin", countryIds: null };
  return { id: userId, role: "moderator", countryIds: rows.filter((r) => r.region_id).map((r) => r.region_id as string) };
}

/** Whether the actor may act on something in this country. A trail with no country yet (open sea, a gap) is for admins. */
export function canActIn(actor: Actor, countryId: string | null | undefined): boolean {
  return actor.countryIds === null || (!!countryId && actor.countryIds.includes(countryId));
}

export const FORBIDDEN = { ok: false, reason: "forbidden" } as const;
