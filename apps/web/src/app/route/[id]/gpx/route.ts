import { getSiteUrl } from "@/lib/site";
import { getSql } from "@/server/db/client";
import { getSharedRoute, sharedRouteGpx } from "@/server/rides/shared-routes";

export async function GET(_request: Request, ctx: RouteContext<"/route/[id]/gpx">) {
  const { id } = await ctx.params;
  const route = await getSharedRoute(getSql(), id);
  if (!route) return new Response("Route not found.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  return new Response(sharedRouteGpx(route, `${getSiteUrl(process.env)}/route/${id}`), {
    headers: {
      "Content-Type": "application/gpx+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="shared-route-${id}.gpx"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
