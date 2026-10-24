import type { Sql } from "postgres";
import { isValidSlug } from "@moto-trails/domain";
import { withPublicRole } from "../db/client";
import { isMember } from "./members";

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const UNMARK_OK = { ok: true } as const;

export type RiddenInput = { userId: string; slug: string; month?: string | null; bike?: string | null; note?: string | null; now: Date };
export type RiddenRider = { riderId: string; displayName: string; riddenMonth: string | null; bike: string | null; note: string | null };
export type RiddenSummary = {
  count: number;
  lastRidden: string | null;
  riders: RiddenRider[];
  /** Riders who count but are not listed because they keep their profile private. */
  unlisted: number;
  mine: { riddenMonth: string | null; bike: string | null; note: string | null } | null;
};

const clean = (s: string | null | undefined, max: number): string | null | "too_long" => {
  const t = String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  if (t.length > max) return "too_long";
  return t || null;
};

/** "I've ridden here": one self-reported record per rider per trail, with an optional month, bike and note. */
export async function markRidden(sql: Sql, i: RiddenInput): Promise<{ ok: true } | { ok: false; reason: "not_member" | "not_found" | "invalid" | "rate_limited" }> {
  if (!isValidSlug(i.slug)) return { ok: false, reason: "not_found" };
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  const bike = clean(i.bike, 60);
  const note = clean(i.note, 200);
  if (bike === "too_long" || note === "too_long") return { ok: false, reason: "invalid" };
  let month: string | null = null;
  if (i.month) {
    const m = MONTH.exec(i.month);
    const current = `${i.now.getUTCFullYear()}-${String(i.now.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!m || i.month > current) return { ok: false, reason: "invalid" };
    month = `${i.month}-01`;
  }
  const [hit] = await sql`select rate_limit_hit(${`ridden:${i.userId}`}, 30, 3600) as ok`;
  if (!hit!.ok) return { ok: false, reason: "rate_limited" };
  const [trail] = await sql`select id from trail where slug = ${i.slug} and lifecycle = 'published'`;
  if (!trail) return { ok: false, reason: "not_found" };
  await sql`
    insert into trail_ridden (user_id, trail_id, ridden_month, bike, note) values (${i.userId}, ${trail.id}, ${month}, ${bike}, ${note})
    on conflict (user_id, trail_id) do update set ridden_month = excluded.ridden_month, bike = excluded.bike, note = excluded.note`;
  return UNMARK_OK;
}

export async function unmarkRidden(sql: Sql, i: { userId: string; slug: string }): Promise<{ ok: true }> {
  if (isValidSlug(i.slug)) {
    await sql`delete from trail_ridden r using trail t where r.trail_id = t.id and t.slug = ${i.slug} and r.user_id = ${i.userId}`;
  }
  return UNMARK_OK;
}

/** The count, the latest ride, the riders who chose to be listed, and the viewer's own record. */
export async function getRiddenSummary(sql: Sql, slug: string, viewerId: string | null): Promise<RiddenSummary> {
  if (!isValidSlug(slug)) return { count: 0, lastRidden: null, riders: [], unlisted: 0, mine: null };
  const [counts, riders] = await withPublicRole(sql, async (tx) => [
    (await tx`select riders, last_ridden::text as last from public_trail_rider_counts where trail_slug = ${slug}`)[0],
    await tx`select rider_id, display_name, ridden_month::text as month, bike, note from public_trail_riders where trail_slug = ${slug} order by created_at desc limit 24`,
  ] as const);
  let mine: RiddenSummary["mine"] = null;
  if (viewerId) {
    const [row] = await sql`
      select r.ridden_month::text as month, r.bike, r.note from trail_ridden r join trail t on t.id = r.trail_id
      where t.slug = ${slug} and r.user_id = ${viewerId}`;
    if (row) mine = { riddenMonth: row.month, bike: row.bike, note: row.note };
  }
  const count = (counts?.riders as number | undefined) ?? 0;
  const [listedTotal] = await withPublicRole(sql, (tx) => tx`select count(*)::int as n from public_trail_riders where trail_slug = ${slug}`);
  return {
    count,
    lastRidden: (counts?.last as string | undefined) ?? null,
    riders: riders.map((r) => ({ riderId: r.rider_id, displayName: r.display_name, riddenMonth: r.month, bike: r.bike, note: r.note })),
    unlisted: Math.max(0, count - ((listedTotal?.n as number | undefined) ?? 0)),
    mine,
  };
}
