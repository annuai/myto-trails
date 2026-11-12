import { connection } from "next/server";
import { isCronRequest } from "@/server/api/cron-auth";
import { getSql } from "@/server/db/client";

/** Daily: recomputes this month's and last month's area cohorts from opted-in riders' coarse ride summaries. */
export async function GET(request: Request) {
  await connection();
  if (!isCronRequest(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  await getSql()`select rollup_cohort_stats()`;
  return Response.json({ ok: true });
}
