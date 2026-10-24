import { isSameOrigin } from "@/server/auth/same-origin";
import { getSql } from "@/server/db/client";
import { nearbyTrails } from "@/server/queries/nearby";

/** Trails near the visitor's position. POST so the coordinates never appear in a URL or an access log. */
export async function POST(request: Request) {
  if (!isSameOrigin(request.headers)) return Response.json({ error: "Cross-site request refused." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { lat?: unknown; lon?: unknown } | null;
  const r = await nearbyTrails(getSql(), { lat: body?.lat, lon: body?.lon }, new Date());
  if (!r.ok) return Response.json({ error: r.reason }, { status: r.reason === "invalid" ? 400 : 200, headers: { "Cache-Control": "no-store" } });
  return Response.json({ items: r.items }, { headers: { "Cache-Control": "no-store" } });
}
