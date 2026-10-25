import { createHash, timingSafeEqual } from "node:crypto";
import type { Sql } from "postgres";
import { createToken, type TokenKind } from "../api/tokens";
import { generateToken, hashToken } from "./tokens";

export const APP_CODE_MINUTES = 5;
const CHALLENGE = /^[A-Za-z0-9_-]{43}$/;
const VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;
const APP_KINDS = ["app_android", "app_ios"] as const;

/** Where the website may send the app after sign-in: the app's own scheme, plus the web test build outside production. */
export function allowedRedirects(env: { APP_REDIRECT_URIS?: string; NODE_ENV?: string }): string[] {
  const configured = (env.APP_REDIRECT_URIS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const dev = env.NODE_ENV === "production" ? [] : ["http://localhost:8081/auth/callback"];
  return [...new Set(["myto://auth", ...configured, ...dev])];
}
/** Exact match only, so a look-alike address can never receive a code. */
export const isAllowedRedirect = (uri: string, list: string[]) => list.includes(uri);

/** RFC 7636, method S256. */
export const pkceChallenge = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");
export const isChallenge = (s: string) => CHALLENGE.test(s);

export async function createAppCode(sql: Sql, i: { userId: string; challenge: string; now?: Date }): Promise<string> {
  if (!CHALLENGE.test(i.challenge)) throw new Error("invalid challenge");
  const code = generateToken();
  await sql`delete from app_auth_code where expires_at < now() - interval '1 day'`;
  await sql`insert into app_auth_code (user_id, code_hash, code_challenge, expires_at) values (${i.userId}, ${hashToken(code)}, ${i.challenge}, now() + make_interval(mins => ${APP_CODE_MINUTES}))`;
  return code;
}

export type ExchangeResult = { ok: true; token: string } | { ok: false; reason: "invalid_grant" | "invalid_request" | "too_many_tokens" };

/** The code is consumed before the verifier is checked, so a wrong guess cannot be retried against the same code. */
export async function exchangeAppCode(sql: Sql, i: { code: string; verifier: string; kind: string }): Promise<ExchangeResult> {
  if (!VERIFIER.test(i.verifier) || !(APP_KINDS as readonly string[]).includes(i.kind) || typeof i.code !== "string" || i.code.length < 20 || i.code.length > 200) return { ok: false, reason: "invalid_request" };
  const rows = await sql`
    update app_auth_code set used_at = now()
    where code_hash = ${hashToken(i.code)} and used_at is null and expires_at > now()
    returning user_id, code_challenge`;
  const row = rows[0];
  if (!row) return { ok: false, reason: "invalid_grant" };
  const expected = Buffer.from(String(row.code_challenge));
  const actual = Buffer.from(pkceChallenge(i.verifier));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return { ok: false, reason: "invalid_grant" };
  const label = i.kind === "app_ios" ? "Myto app (iPhone)" : "Myto app (Android or web)";
  const t = await createToken(sql, { userId: row.user_id as string, kind: i.kind as TokenKind, label, scopes: ["saved", "write:submission"] });
  return t.ok ? { ok: true, token: t.token } : { ok: false, reason: "too_many_tokens" };
}
