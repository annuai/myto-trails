import { getCurrentUser } from "@/server/auth/session";
import { isSameOrigin } from "@/server/auth/same-origin";
import { getSql } from "@/server/db/client";
import { getStorage } from "@/server/storage";
import { requestUpload } from "@/server/uploads/service";

/** Asks for a signed upload URL. Body: { kind: "gpx" | "image", contentType, sizeBytes }. */
export async function POST(request: Request) {
  if (!isSameOrigin(request.headers)) return Response.json({ error: "Cross-site request refused." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to upload." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { kind?: unknown; contentType?: unknown; sizeBytes?: unknown } | null;
  if (!body || (body.kind !== "gpx" && body.kind !== "image") || typeof body.contentType !== "string" || typeof body.sizeBytes !== "number") {
    return Response.json({ error: "Send kind, contentType and sizeBytes." }, { status: 400 });
  }
  const result = await requestUpload(getSql(), getStorage(), { userId: user.id, kind: body.kind, contentType: body.contentType, sizeBytes: body.sizeBytes });
  if (!result.ok) {
    return result.reason === "rate_limited"
      ? Response.json({ error: "Too many uploads. Try again later." }, { status: 429 })
      : Response.json({ error: "That file type or size is not allowed." }, { status: 400 });
  }
  return Response.json({ uploadId: result.uploadId, target: result.target, contentType: result.contentType }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
