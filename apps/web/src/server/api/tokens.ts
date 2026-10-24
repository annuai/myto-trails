import type { Sql } from "postgres";
import { generateToken, hashToken } from "../auth/tokens";

export const TOKEN_KINDS = ["app_ios", "app_android", "navi"] as const;
export const TOKEN_SCOPES = ["saved", "write:submission"] as const;
export type TokenKind = (typeof TOKEN_KINDS)[number];
export type TokenScope = (typeof TOKEN_SCOPES)[number];
const MAX_TOKENS = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHAPE = /^mt_[A-Za-z0-9_-]{43}$/;

export async function createToken(
  sql: Sql,
  i: { userId: string; kind: TokenKind; label: string; scopes: TokenScope[] },
): Promise<{ ok: true; id: string; token: string } | { ok: false; reason: "invalid" | "too_many" }> {
  const label = String(i.label ?? "").trim();
  const scopes = [...new Set(i.scopes ?? [])];
  if (!TOKEN_KINDS.includes(i.kind) || label.length < 1 || label.length > 60 || scopes.length === 0 || scopes.some((s) => !TOKEN_SCOPES.includes(s))) return { ok: false, reason: "invalid" };
  return sql.begin(async (tx) => {
    await tx`select id from app_user where id = ${i.userId} for update`;
    const [c] = await tx`select count(*)::int as n from api_token where user_id = ${i.userId} and revoked_at is null`;
    if (c!.n >= MAX_TOKENS) return { ok: false, reason: "too_many" } as const;
    const token = `mt_${generateToken()}`;
    const [row] = await tx`insert into api_token (user_id, kind, label, token_hash, scopes) values (${i.userId}, ${i.kind}, ${label}, ${hashToken(token)}, ${scopes}) returning id`;
    return { ok: true, id: row!.id as string, token } as const;
  });
}

export type VerifiedToken = { userId: string; tokenId: string; scopes: TokenScope[]; kind: TokenKind };

/** Looks a bearer token up by its hash. Revoked tokens and tokens of inactive accounts do not verify. */
export async function verifyToken(sql: Sql, token: string): Promise<VerifiedToken | null> {
  if (!SHAPE.test(token)) return null;
  const [row] = await sql`
    update api_token t set last_used_at = now()
    from app_user u
    where t.token_hash = ${hashToken(token)} and t.revoked_at is null and u.id = t.user_id and u.status = 'active'
    returning t.id, t.user_id, t.scopes, t.kind`;
  return row ? { userId: row.user_id, tokenId: row.id, scopes: row.scopes, kind: row.kind } : null;
}

export async function revokeToken(sql: Sql, i: { userId: string; tokenId: string }): Promise<{ ok: true } | { ok: false; reason: "not_found" }> {
  if (!UUID.test(i.tokenId)) return { ok: false, reason: "not_found" };
  const rows = await sql`update api_token set revoked_at = now() where id = ${i.tokenId} and user_id = ${i.userId} and revoked_at is null returning id`;
  return rows.length ? { ok: true } : { ok: false, reason: "not_found" };
}

export type TokenListItem = { id: string; kind: TokenKind; label: string; scopes: TokenScope[]; createdAt: string; lastUsedAt: string | null; revoked: boolean };

export async function listTokens(sql: Sql, userId: string): Promise<TokenListItem[]> {
  const rows = await sql`select id, kind, label, scopes, created_at, last_used_at, revoked_at from api_token where user_id = ${userId} order by created_at desc limit 50`;
  return rows.map((r) => ({ id: r.id, kind: r.kind, label: r.label, scopes: r.scopes, createdAt: (r.created_at as Date).toISOString(), lastUsedAt: r.last_used_at ? (r.last_used_at as Date).toISOString() : null, revoked: r.revoked_at !== null }));
}
