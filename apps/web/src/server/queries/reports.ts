import { isValidSlug, reportPriority, validateReport } from "@moto-trails/domain";
import type { Sql } from "postgres";

export type CreateReportResult = { ok: true; ref: string } | { ok: false; reason: "invalid" | "not_found" | "rate_limited" };

const refOf = (id: string) => id.replace(/-/g, "").slice(0, 8).toUpperCase();

/**
 * Files a report about a published trail on behalf of a signed-in rider. An identical report within an hour
 * is treated as a double submit; each rider may file 10 new reports a day.
 */
export async function createReport(sql: Sql, i: { userId: string; slug: string; type: string; details: string }): Promise<CreateReportResult> {
  const checked = validateReport({ type: i.type, details: i.details });
  if (!checked.ok) return { ok: false, reason: "invalid" };
  if (!isValidSlug(i.slug)) return { ok: false, reason: "not_found" };

  const [trail] = await sql`select id from trail where slug = ${i.slug} and lifecycle = 'published' and published_revision_id is not null`;
  if (!trail) return { ok: false, reason: "not_found" };

  const [existing] = await sql`
    select id from trail_report
    where reporter_id = ${i.userId} and trail_id = ${trail.id} and type = ${checked.value.type} and details = ${checked.value.details}
      and created_at > now() - interval '1 hour'
    limit 1`;
  if (existing) return { ok: true, ref: refOf(existing.id as string) };

  const [limit] = await sql`select rate_limit_hit(${`report:${i.userId}`}, 10, 86400) as ok`;
  if (!limit?.ok) return { ok: false, reason: "rate_limited" };

  const [row] = await sql`
    insert into trail_report (trail_id, reporter_id, type, details, priority)
    values (${trail.id}, ${i.userId}, ${checked.value.type}, ${checked.value.details}, ${reportPriority(checked.value.type)})
    returning id`;
  return { ok: true, ref: refOf(row!.id as string) };
}
