import { getLocalStorage } from "@/server/storage/local-instance";

export async function PUT(request: Request) {
  const storage = getLocalStorage();
  if (!storage) return new Response("Not found", { status: 404 });
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const body = new Uint8Array(await request.arrayBuffer());
  const result = await storage.handlePut(token, request.headers.get("content-type") ?? "", body);
  return result.ok ? new Response(null, { status: 200 }) : new Response(result.reason, { status: result.status });
}
