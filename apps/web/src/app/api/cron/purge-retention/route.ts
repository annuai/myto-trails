import { connection } from "next/server";
import { isCronRequest } from "@/server/api/cron-auth";
import { getSql } from "@/server/db/client";
import { purgeRetention } from "@/server/retention/purge";
import { getStorage } from "@/server/storage";

/** Nightly sweep: deletes data that has outlived its retention (see RETENTION_DAYS). A rule that fails is named in `failed` and the rest still run. */
export async function GET(request: Request) {
  await connection();
  if (!isCronRequest(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const sql = getSql();
  const result = await purgeRetention(sql, getStorage(), new Date());
  // Same nightly run: recompute area cohorts (this and last month only; older ones are deleted there). A failure is named, not thrown.
  try {
    await sql`select rollup_cohort_stats()`;
  } catch (e) {
    console.error("Retention purge: cohort rollup failed", e instanceof Error ? e.message : e);
    result.failed.push("cohort_rollup");
  }
  return Response.json(result);
}
