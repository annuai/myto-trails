import { buildGpxExport } from "@/server/gpx/export";
import { getSiteUrl } from "@/lib/site";
import { clientIp, hashIp } from "@/server/auth/request-context";
import { getStorage } from "@/server/storage";

const REFUSALS = {
  not_found: [404, "Trail not found."],
  no_gpx: [404, "This trail has no GPX file."],
  not_published: [404, "Trail not found."],
  sensitive_area: [403, "The route of this trail is not published."],
  access_not_allowed: [403, "This trail's access status does not allow a download."],
  permanently_closed: [403, "This trail is permanently closed, so no GPX is offered."],
  rate_limited: [429, "Too many downloads. Please try again later."],
  unavailable: [503, "The file is unavailable right now. Please try again later."],
} as const;

export async function GET(request: Request, ctx: RouteContext<"/trails/[slug]/gpx">) {
  const { slug } = await ctx.params;
  const result = await buildGpxExport({ storage: getStorage(), slug, now: new Date(), ipHash: hashIp(clientIp(request.headers)), siteUrl: getSiteUrl(process.env) });
  if (!result.ok) {
    const [status, message] = REFUSALS[result.reason];
    return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  }
  return new Response(result.xml, {
    headers: {
      "Content-Type": "application/gpx+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
