import { corsOrigins } from "@/server/api/cors-origins";
import { getLocalStorage } from "@/server/storage/local-instance";

// Development only (the local storage provider). The signed URL is the credential; CORS lets the app's web build use it.
function cors(request: Request, preflight = false): Headers {
  const h = new Headers();
  const origin = request.headers.get("origin");
  if (origin && corsOrigins().includes(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.append("Vary", "Origin");
    if (preflight) {
      h.set("Access-Control-Allow-Methods", "PUT, OPTIONS");
      h.set("Access-Control-Allow-Headers", "Content-Type");
    }
  }
  return h;
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: cors(request, true) });
}

export async function PUT(request: Request) {
  const storage = getLocalStorage();
  if (!storage) return new Response("Not found", { status: 404 });
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const body = new Uint8Array(await request.arrayBuffer());
  const result = await storage.handlePut(token, request.headers.get("content-type") ?? "", body);
  return result.ok ? new Response(null, { status: 200, headers: cors(request) }) : new Response(result.reason, { status: result.status, headers: cors(request) });
}
