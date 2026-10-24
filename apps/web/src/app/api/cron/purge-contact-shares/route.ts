import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { getSql } from "@/server/db/client";
import { purgeJoinPhones } from "@/server/community/clubs";
import { purgeExpiredContactShares } from "@/server/community/questions";

/** Scheduled sweep: wipes phone numbers (question shares and club join requests) whose time has run out, even if nobody opens the page. */
export async function GET(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET ?? "";
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const ok = secret.length >= 32 && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return Response.json({ error: "unauthorized" }, { status: 401 });
  const now = new Date();
  const sql = getSql();
  return Response.json({ purged: await purgeExpiredContactShares(sql, now), clubPhonesPurged: await purgeJoinPhones(sql, now) });
}
