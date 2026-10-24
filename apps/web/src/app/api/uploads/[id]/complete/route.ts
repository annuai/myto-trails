import { getCurrentUser } from "@/server/auth/session";
import { isSameOrigin } from "@/server/auth/same-origin";
import { getSql } from "@/server/db/client";
import { getStorage } from "@/server/storage";
import { completeUpload } from "@/server/uploads/service";

/** Called by the browser after its PUT: verifies and processes the file. */
export async function POST(request: Request, ctx: RouteContext<"/api/uploads/[id]/complete">) {
  if (!isSameOrigin(request.headers)) return Response.json({ error: "Cross-site request refused." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await ctx.params;
  const result = await completeUpload(getSql(), getStorage(), { userId: user.id, uploadId: id });
  return result.status === "not_found"
    ? Response.json({ error: "Upload not found." }, { status: 404 })
    : Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
