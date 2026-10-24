import { dispatch } from "@/server/api/http";
import { routes } from "@/server/api/routes";
import { getSiteUrl } from "@/lib/site";
import { getSql } from "@/server/db/client";
import { getStorage } from "@/server/storage";

function handle(req: Request) {
  return dispatch(req, routes, { sql: getSql(), storage: getStorage(), now: new Date(), siteUrl: getSiteUrl(process.env) });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
