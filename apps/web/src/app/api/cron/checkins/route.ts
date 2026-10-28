import { connection } from "next/server";
import { isCronRequest } from "@/server/api/cron-auth";
import { getEmailSender } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { sweepCheckins } from "@/server/rides/checkins";
import { sweepGroupRides } from "@/server/rides/group-rides";

/**
 * Scheduled sweep: emails a rider's contact once when a check-in turns overdue, wipes positions and emergency details of
 * check-ins that ended a day ago, and ends group rides past their time. The tracking page works out "overdue" itself, so it is
 * right even if this never runs; only the email depends on how often it does.
 */
export async function GET(request: Request) {
  await connection();
  if (!isCronRequest(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const now = new Date();
  const sql = getSql();
  const checkins = await sweepCheckins(sql, getEmailSender(), now);
  return Response.json({ ...checkins, groupRidesEnded: await sweepGroupRides(sql, now) });
}
