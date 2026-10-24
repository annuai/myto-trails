import type { Sql } from "postgres";
import { clientIp, hashIp } from "../auth/request-context";
import type { StorageProvider } from "../storage";
import { verifyToken, type TokenScope, type VerifiedToken } from "./tokens";

export const MAX_BODY_BYTES = 64 * 1024;
const PUBLIC_PER_MINUTE = 120;
const TOKEN_PER_MINUTE = 600;

export type Deps = { sql: Sql; storage: StorageProvider; now: Date; siteUrl: string };
export type Ctx = Deps & {
  req: Request;
  url: URL;
  params: Record<string, string>;
  auth: VerifiedToken | null;
  /** The token's user; set only on routes that require a token. */
  userId: string;
  body(): Promise<unknown>;
};
export type RouteDef = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Relative to /api/v1, with {param} segments. */
  path: string;
  /** `public` needs no token; a scope needs a token that holds it; `token` needs any valid token. */
  access: "public" | "token" | TokenScope;
  summary: string;
  handler: (ctx: Ctx) => Promise<Response>;
};

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly extra?: Record<string, unknown>) {
    super(message);
  }
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });

export const ok = (body: unknown, status = 200) => json(status, body);
export const fail = (status: number, code: string, message: string, extra?: Record<string, unknown>) => json(status, { error: { code, message, ...extra } });

function compile(path: string): RegExp {
  const escaped = path.split(/(\{\w+\})/).map((part) => (/^\{\w+\}$/.test(part) ? "([^/]+)" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("");
  return new RegExp(`^${escaped}/?$`);
}

export function matchRoute(routes: RouteDef[], method: string, path: string): { route: RouteDef; params: Record<string, string> } | "method" | null {
  let pathMatched = false;
  for (const route of routes) {
    const m = compile(route.path).exec(path);
    if (!m) continue;
    pathMatched = true;
    if (route.method !== method) continue;
    const names = [...route.path.matchAll(/\{(\w+)\}/g)].map((x) => x[1]!);
    const params: Record<string, string> = {};
    for (const [i, n] of names.entries()) {
      try {
        params[n] = decodeURIComponent(m[i + 1]!);
      } catch {
        return null;
      }
    }
    return { route, params };
  }
  return pathMatched ? "method" : null;
}

/** Reads the body but stops as soon as it exceeds the cap, so a huge upload never sits in memory. */
async function readCapped(req: Request): Promise<string> {
  const tooLarge = () => new ApiError(413, "body_too_large", "The request body is too large.");
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw tooLarge();
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** The single entry point for /api/v1: authentication, scopes, rate limits, body limits and one error shape. */
export async function dispatch(req: Request, routes: RouteDef[], deps: Deps): Promise<Response> {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/v1/, "") || "/";
    const matched = matchRoute(routes, req.method === "HEAD" ? "GET" : req.method, path);
    if (matched === null) return fail(404, "not_found", "No such endpoint.");
    if (matched === "method") return fail(405, "method_not_allowed", "That method is not supported here.");
    const { route, params } = matched;

    let auth: VerifiedToken | null = null;
    const header = req.headers.get("authorization");
    if (header !== null) {
      const m = /^bearer (\S+)$/i.exec(header);
      auth = m ? await verifyToken(deps.sql, m[1]!) : null;
      if (!auth) return fail(401, "invalid_token", "The token is missing, revoked or not valid.", undefined);
    }
    if (route.access !== "public") {
      if (!auth) return fail(401, "auth_required", "This endpoint needs a device token.");
      if (route.access !== "token" && !auth.scopes.includes(route.access)) return fail(403, "insufficient_scope", `This endpoint needs the "${route.access}" scope.`);
    }

    const key = auth ? `api:tok:${auth.tokenId}` : `api:ip:${hashIp(clientIp(req.headers))}`;
    const [hit] = await deps.sql`select rate_limit_hit(${key}, ${auth ? TOKEN_PER_MINUTE : PUBLIC_PER_MINUTE}, 60) as ok`;
    if (!hit!.ok) return fail(429, "rate_limited", "Too many requests. Slow down and retry shortly.");

    let cached: unknown;
    let read = false;
    const ctx: Ctx = {
      ...deps, req, url, params, auth, userId: auth?.userId ?? "",
      async body() {
        if (read) return cached;
        const text = await readCapped(req);
        try {
          cached = JSON.parse(text);
        } catch {
          throw new ApiError(400, "invalid_json", "The request body must be valid JSON.");
        }
        read = true;
        return cached;
      },
    };
    return await route.handler(ctx);
  } catch (e) {
    if (e instanceof ApiError) return fail(e.status, e.code, e.message, e.extra);
    console.error("API error", e instanceof Error ? e.message : "unknown");
    return fail(500, "internal_error", "Something went wrong on our side.");
  }
}
