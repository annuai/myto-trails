import { PUBLIC_DAY_CACHE_CONTROL } from "@/server/api/cache";
import { getSql, withPublicRole } from "@/server/db/client";
import { suggest } from "@/server/queries/search.sql";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  try {
    const result = await withPublicRole(getSql(), (tx) => suggest(tx, q));
    return Response.json(result, { headers: { "Cache-Control": PUBLIC_DAY_CACHE_CONTROL } });
  } catch {
    return Response.json({ error: "Suggestions are unavailable right now." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
