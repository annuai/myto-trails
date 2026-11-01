import type { Sql } from "postgres";
import { WOMEN_SAFE_CONFIRMED_AT, isValidSlug, type WomenSafe } from "@moto-trails/domain";
import { getMemberState, isMember, type MemberState } from "./members";

const WINDOW_MONTHS = 24;
const MARKS_PER_DAY = 30;
const DONE = { ok: true } as const;

/** Marks older than this no longer count. */
export function womenSafeCutoff(now: Date): Date {
  const d = new Date(now);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - WINDOW_MONTHS);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

/** Only a declared member whose private gender is female may mark. */
export const canMarkWomenSafe = (m: Pick<MemberState, "confirmed" | "gender"> | null): boolean => m !== null && m.confirmed && m.gender === "female";

export function summarizeWomenSafe(i: { count: number; mine: boolean; canMark: boolean }): WomenSafe {
  return { count: i.count, confirmed: i.count >= WOMEN_SAFE_CONFIRMED_AT, mine: i.mine, canMark: i.canMark };
}

/**
 * A woman rider says she found a trail safe. One mark per rider per trail; marking again renews it. Nothing here
 * can be read back with a name: only the count of distinct riders is ever shown.
 */
export async function markWomenSafe(
  sql: Sql,
  i: { userId: string; slug: string; now: Date },
): Promise<{ ok: true } | { ok: false; reason: "not_member" | "not_female" | "not_found" | "rate_limited" }> {
  if (!isValidSlug(i.slug)) return { ok: false, reason: "not_found" };
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  if (!canMarkWomenSafe(await getMemberState(sql, i.userId))) return { ok: false, reason: "not_female" };
  const [trail] = await sql`select id from trail where slug = ${i.slug} and lifecycle = 'published'`;
  if (!trail) return { ok: false, reason: "not_found" };
  const [hit] = await sql`select rate_limit_hit(${`women-safe:${i.userId}`}, ${MARKS_PER_DAY}, 86400) as ok`;
  if (!hit!.ok) return { ok: false, reason: "rate_limited" };
  await sql`
    insert into trail_women_safe (trail_id, user_id, created_at) values (${trail.id}, ${i.userId}, ${i.now})
    on conflict (trail_id, user_id) do update set created_at = excluded.created_at`;
  return DONE;
}

export async function unmarkWomenSafe(sql: Sql, i: { userId: string; slug: string }): Promise<{ ok: true }> {
  if (isValidSlug(i.slug)) {
    await sql`delete from trail_women_safe w using trail t where w.trail_id = t.id and t.slug = ${i.slug} and w.user_id = ${i.userId}`;
  }
  return DONE;
}

/** The count of distinct riders in the last 24 months and the viewer's own state. An anonymous viewer passes null. */
export async function getWomenSafe(sql: Sql, i: { slug: string; viewerId: string | null; now: Date }): Promise<WomenSafe> {
  if (!isValidSlug(i.slug)) return summarizeWomenSafe({ count: 0, mine: false, canMark: false });
  const cutoff = womenSafeCutoff(i.now);
  const member = i.viewerId ? await getMemberState(sql, i.viewerId) : null;
  const [row] = await sql`
    select count(distinct w.user_id)::int as n, coalesce(bool_or(w.user_id = ${i.viewerId}::uuid), false) as mine
    from trail_women_safe w
    join trail t on t.id = w.trail_id
    join app_user u on u.id = w.user_id and u.status = 'active'
    where t.slug = ${i.slug} and w.created_at > ${cutoff}`;
  return summarizeWomenSafe({ count: (row?.n as number | undefined) ?? 0, mine: Boolean(row?.mine), canMark: canMarkWomenSafe(member) });
}
