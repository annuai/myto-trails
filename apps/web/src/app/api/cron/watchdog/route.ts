import { connection } from "next/server";
import { isCronRequest } from "@/server/api/cron-auth";
import { minutesSinceHeartbeat } from "@/server/api/heartbeat";
import { getSql } from "@/server/db/client";

/** The check-in sweep runs every ten minutes; GitHub can start it late, so allow 45 before calling it stalled. */
export const STALE_AFTER_MINUTES = 45;

/** Answers 503 when the check-in sweep has not finished recently, so a failing GitHub step tells the owner. */
export async function GET(request: Request) {
  await connection();
  if (!isCronRequest(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const minutes = await minutesSinceHeartbeat(getSql(), "checkins");
  const ok = minutes !== null && minutes <= STALE_AFTER_MINUTES;
  return Response.json({ ok, minutesSinceSweep: minutes === null ? null : Math.round(minutes) }, { status: ok ? 200 : 503 });
}
