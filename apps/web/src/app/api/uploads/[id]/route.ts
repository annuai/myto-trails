import { getCurrentUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { getUploadStatus } from "@/server/uploads/service";

export async function GET(_request: Request, ctx: RouteContext<"/api/uploads/[id]">) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await ctx.params;
  const result = await getUploadStatus(getSql(), user.id, id);
  return result.status === "not_found"
    ? Response.json({ error: "Upload not found." }, { status: 404 })
    : Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
