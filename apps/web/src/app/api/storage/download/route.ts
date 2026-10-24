import { connection } from "next/server";
import { getLocalStorage } from "@/server/storage/local-instance";

export async function GET(request: Request) {
  await connection(); // request-time only: never evaluated during the build
  const storage = getLocalStorage();
  if (!storage) return new Response("Not found", { status: 404 });
  const result = await storage.handleGet(new URL(request.url).searchParams.get("t") ?? "");
  if (!result.ok) return new Response(result.reason, { status: result.status });
  const headers: Record<string, string> = { "Content-Type": result.contentType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (result.contentDisposition) headers["Content-Disposition"] = result.contentDisposition;
  return new Response(result.body as unknown as BodyInit, { headers });
}
