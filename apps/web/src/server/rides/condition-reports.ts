import { isValidSlug } from "@moto-trails/domain";
import type { Sql } from "postgres";
import { cleanBody, LINK } from "../community/comments";
import { isMember } from "../community/members";
import { ownsMedia } from "../community/profile";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = 86_400_000;
export const KINDS = ["clear", "muddy", "blocked", "washed_out", "closed"] as const;
export type ConditionKind = (typeof KINDS)[number];
const REPORTS_PER_DAY = 30;
/** A report is "fresh" for two weeks; after that it still shows, but as old. */
export const FRESH_DAYS = 14;
/** A queued report may be uploaded late, but not older than this, and never from the future. */
const MAX_AGE_DAYS = 30;
const CLOCK_SKEW_MS = 5 * 60_000;
const LISTED_DAYS = 60;

export const isFresh = (reportedAt: Date, now: Date) => now.getTime() - reportedAt.getTime() <= FRESH_DAYS * DAY;

type Fail<R extends string> = { ok: false; reason: R };

/**
 * A rider's report of what a trail is like right now. It is dated evidence from a rider and is shown as that. It never
 * changes the trail's published access or condition: those change only through moderators.
 */
export async function createConditionReport(
  sql: Sql,
  i: { userId: string; slug: string; clientId: unknown; kind: unknown; note: unknown; at: unknown; lat: unknown; lng: unknown; mediaId: unknown; now: Date },
): Promise<{ ok: true; id: string } | Fail<"not_member" | "not_found" | "invalid" | "no_links" | "rate_limited">> {
  if (!isValidSlug(i.slug)) return { ok: false, reason: "not_found" };
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  const clientId = typeof i.clientId === "string" ? i.clientId.trim() : "";
  const at = typeof i.at === "string" ? new Date(i.at) : null;
  const note = i.note === undefined || i.note === null || i.note === "" ? null : cleanBody(i.note);
  const hasPos = i.lat !== undefined && i.lat !== null;
  if (clientId.length < 8 || clientId.length > 64 || !(KINDS as readonly unknown[]).includes(i.kind) || !at || Number.isNaN(at.getTime())) return { ok: false, reason: "invalid" };
  if (at.getTime() > i.now.getTime() + CLOCK_SKEW_MS || at.getTime() < i.now.getTime() - MAX_AGE_DAYS * DAY) return { ok: false, reason: "invalid" };
  if (note !== null && note.length > 300) return { ok: false, reason: "invalid" };
  if (note !== null && LINK.test(note)) return { ok: false, reason: "no_links" };
  if (hasPos && !(typeof i.lat === "number" && typeof i.lng === "number" && Math.abs(i.lat) <= 90 && Math.abs(i.lng) <= 180)) return { ok: false, reason: "invalid" };
  const mediaId = typeof i.mediaId === "string" ? i.mediaId : null;
  if (i.mediaId !== undefined && i.mediaId !== null && (mediaId === null || !(await ownsMedia(sql, i.userId, mediaId)))) return { ok: false, reason: "invalid" };
  return sql.begin(async (tx) => {
    const [trail] = await tx`select id from trail where slug = ${i.slug} and lifecycle = 'published'`;
    if (!trail) return { ok: false, reason: "not_found" } as const;
    // A retry of an upload that already went through is answered with the same id and costs nothing.
    const [again] = await tx`select id from condition_report where user_id = ${i.userId} and client_id = ${clientId}`;
    if (again) return { ok: true, id: again.id as string } as const;
    const [hit] = await tx`select rate_limit_hit(${`condition-report:${i.userId}`}, ${REPORTS_PER_DAY}, 86400) as ok`;
    if (!hit!.ok) return { ok: false, reason: "rate_limited" } as const;
    const [row] = await tx`
      insert into condition_report (trail_id, user_id, client_id, kind, note, reported_at, lat, lng, media_id)
      values (${trail.id}, ${i.userId}, ${clientId}, ${i.kind as string}, ${note}, ${at}, ${hasPos ? (i.lat as number) : null}, ${hasPos ? (i.lng as number) : null}, ${mediaId}) returning id`;
    return { ok: true, id: row!.id as string } as const;
  });
}

/** "Still true?": one vote per rider, changeable, never on your own report. */
export async function confirmConditionReport(sql: Sql, i: { userId: string; reportId: string; still: boolean }): Promise<{ ok: true } | Fail<"not_member" | "not_found" | "own_report">> {
  if (!UUID.test(i.reportId)) return { ok: false, reason: "not_found" };
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  const [r] = await sql`select user_id from condition_report where id = ${i.reportId} and status = 'visible'`;
  if (!r) return { ok: false, reason: "not_found" };
  if (r.user_id === i.userId) return { ok: false, reason: "own_report" };
  await sql`
    insert into condition_report_vote (report_id, user_id, still) values (${i.reportId}, ${i.userId}, ${i.still})
    on conflict (report_id, user_id) do update set still = excluded.still, created_at = now()`;
  return { ok: true };
}

export type PublicConditionReport = { id: string; kind: ConditionKind; at: string; confirmations: number; disputes: number; fresh: boolean };

/** Recent reports for a trail, newest first. No rider, note or position is exposed. Null for an unknown trail. */
export async function listConditionReports(sql: Sql, slug: string, now: Date): Promise<PublicConditionReport[] | null> {
  if (!isValidSlug(slug)) return null;
  const [trail] = await sql`select id from trail where slug = ${slug} and lifecycle = 'published'`;
  if (!trail) return null;
  const rows = await sql`
    select r.id, r.kind, r.reported_at,
      (select count(*)::int from condition_report_vote v where v.report_id = r.id and v.still) as confirmations,
      (select count(*)::int from condition_report_vote v where v.report_id = r.id and not v.still) as disputes
    from condition_report r
    where r.trail_id = ${trail.id} and r.status = 'visible' and r.reported_at > ${new Date(now.getTime() - LISTED_DAYS * DAY)}
    order by r.reported_at desc limit 20`;
  return rows.map((r) => ({ id: r.id, kind: r.kind, at: (r.reported_at as Date).toISOString(), confirmations: r.confirmations, disputes: r.disputes, fresh: isFresh(r.reported_at, now) }));
}
