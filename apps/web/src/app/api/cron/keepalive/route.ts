import { connection } from "next/server";
import { isCronRequest } from "@/server/api/cron-auth";
import { getSql } from "@/server/db/client";

/** Scheduled ping so a free-tier Supabase project is never idle for 7 days: one database query, and one REST call when Supabase is configured. */
export async function GET(request: Request) {
  await connection();
  if (!isCronRequest(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  await getSql()`select 1`;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let rest: boolean | null = null;
  if (url && key) {
    rest = await fetch(`${url}/rest/v1/`, { headers: { apikey: key }, cache: "no-store" }).then((r) => r.ok, () => false);
  }
  return Response.json({ db: true, rest });
}
