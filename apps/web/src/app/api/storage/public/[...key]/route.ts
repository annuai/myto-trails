import { getLocalStorage } from "@/server/storage/local-instance";

export async function GET(_request: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const storage = getLocalStorage();
  if (!storage) return new Response("Not found", { status: 404 });
  const { key } = await ctx.params;
  const result = await storage.readPublic(key.join("/"));
  if (!result.ok) return new Response(result.reason, { status: result.status });
  return new Response(result.body as unknown as BodyInit, {
    headers: { "Content-Type": result.contentType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
