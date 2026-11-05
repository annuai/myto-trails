import { connection } from "next/server";
import { isCronRequest } from "@/server/api/cron-auth";
import { getSql } from "@/server/db/client";
import { purgeRetention } from "@/server/retention/purge";
import { getStorage } from "@/server/storage";

/** Nightly sweep: deletes data that has outlived its retention (see RETENTION_DAYS). A rule that fails is named in `failed` and the rest still run. */
export async function GET(request: Request) {
  await connection();
  if (!isCronRequest(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await purgeRetention(getSql(), getStorage(), new Date()));
}
