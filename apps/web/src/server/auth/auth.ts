import type { Sql } from "postgres";
import type { EmailSender } from "./email";
import { signInEmail } from "./email";
import { safeNextPath } from "./safe-next";
import { generateToken, hashToken } from "./tokens";

export const LOGIN_TOKEN_MINUTES = 15;
export const SESSION_DAYS = 30;

export type Role = "moderator" | "admin";
export type SessionUser = { id: string; email: string; displayName: string; roles: Role[]; /** The rider has made the 18+ and driving licence declaration. */ confirmed: boolean };

const EMAIL = /^[^@\s]+@[^@\s]+$/;

export function normalizeEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  return email.length > 0 && email.length <= 254 && EMAIL.test(email) ? email : null;
}

/** Variants like "a+x@mail" and "A@mail" share one limit so tags cannot be used to dodge it. */
const rateKey = (email: string) => {
  const [local, domain] = email.split("@") as [string, string];
  return `${local.split("+")[0]}@${domain}`;
};

const nameFromEmail = (email: string) => {
  const name = email.split("@")[0]!.slice(0, 40);
  return name.length >= 2 ? name : "Rider";
};

async function allowed(sql: Sql, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const [row] = await sql`select rate_limit_hit(${key}, ${limit}, ${windowSeconds}) as ok`;
  return Boolean(row?.ok);
}

/**
 * Starts a sign-in by emailing a one-time link. The outcome is the same for known, unknown and invalid
 * addresses and for email failures, so nobody can learn whether an account exists.
 */
export async function requestSignIn(
  sql: Sql,
  i: { email: string; ipHash: string | null; sender: EmailSender; baseUrl: string; next?: string },
): Promise<{ status: "sent" | "rate_limited" }> {
  const email = normalizeEmail(i.email);
  if (!email) return { status: "sent" };
  // The network limit is checked first, so a flood from one place cannot use up someone else's address limit
  // (which would lock them out of signing in). Without a usable address only the per-address limit applies.
  if (i.ipHash !== null && !(await allowed(sql, `signin:ip:${i.ipHash}`, 20, 3600))) return { status: "rate_limited" };
  if (!(await allowed(sql, `signin:email:${rateKey(email)}`, 5, 900))) return { status: "rate_limited" };

  const token = generateToken();
  await sql`
    insert into login_token (email, token_hash, expires_at, ip_hash)
    values (${email}, ${hashToken(token)}, now() + make_interval(mins => ${LOGIN_TOKEN_MINUTES}), ${i.ipHash})`;
  const link = `${i.baseUrl}/auth/confirm?token=${token}&next=${encodeURIComponent(safeNextPath(i.next))}`;
  const { subject, text } = signInEmail({ link, minutes: LOGIN_TOKEN_MINUTES });
  try {
    await i.sender.send({ to: email, subject, text });
  } catch (e) {
    console.error("sign-in email failed:", e instanceof Error ? e.message : "unknown error");
  }
  return { status: "sent" };
}

/** True while the token is unused and unexpired. Does not consume it. */
export async function peekLoginToken(sql: Sql, token: string): Promise<boolean> {
  if (!token || token.length > 200) return false;
  const rows = await sql`select 1 from login_token where token_hash = ${hashToken(token)} and used_at is null and expires_at > now()`;
  return rows.length > 0;
}

export type ConfirmResult = { ok: true; sessionToken: string; user: SessionUser } | { ok: false; reason: "invalid" };

/** Consumes a sign-in token (atomically, once) and starts a new session. Every failure looks the same. */
export async function confirmSignIn(sql: Sql, i: { token: string }): Promise<ConfirmResult> {
  if (!i.token || i.token.length > 200) return { ok: false, reason: "invalid" };
  const result = await sql.begin(async (tx) => {
    const [row] = await tx`
      update login_token set used_at = now()
      where token_hash = ${hashToken(i.token)} and used_at is null and expires_at > now()
      returning email`;
    if (!row) return { ok: false as const, reason: "invalid" as const };
    const email = row.email as string;
    const [user] = await tx`
      insert into app_user (email, display_name, last_seen_at) values (${email}, ${nameFromEmail(email)}, now())
      on conflict (email) do update set last_seen_at = now()
      returning id, email, display_name, status, adult_confirmed_at`;
    if (!user || user.status !== "active") return { ok: false as const, reason: "invalid" as const };
    const sessionToken = generateToken();
    await tx`
      insert into auth_session (user_id, token_hash, expires_at)
      values (${user.id}, ${hashToken(sessionToken)}, now() + make_interval(days => ${SESSION_DAYS}))`;
    const roles = await tx`select role from user_role where user_id = ${user.id}`;
    return {
      ok: true as const,
      sessionToken,
      user: { id: user.id as string, email: user.email as string, displayName: user.display_name as string, roles: roles.map((r) => r.role as Role), confirmed: user.adult_confirmed_at !== null },
    };
  });
  return result as ConfirmResult;
}

export async function getSessionUser(sql: Sql, token: string): Promise<SessionUser | null> {
  if (!token || token.length > 200) return null;
  const hash = hashToken(token);
  const [row] = await sql`
    select u.id, u.email, u.display_name, u.adult_confirmed_at, s.id as session_id
    from auth_session s join app_user u on u.id = s.user_id
    where s.token_hash = ${hash} and s.expires_at > now() and u.status = 'active'`;
  if (!row) return null;
  await sql`update auth_session set last_seen_at = now() where id = ${row.session_id} and last_seen_at < now() - interval '1 hour'`;
  const roles = await sql`select role from user_role where user_id = ${row.id}`;
  return { id: row.id, email: row.email, displayName: row.display_name, roles: roles.map((r) => r.role as Role), confirmed: row.adult_confirmed_at !== null };
}

export async function signOut(sql: Sql, token: string): Promise<void> {
  if (token) await sql`delete from auth_session where token_hash = ${hashToken(token)}`;
}

export async function signOutEverywhere(sql: Sql, userId: string): Promise<void> {
  await sql`delete from auth_session where user_id = ${userId}`;
}

export async function updateDisplayName(sql: Sql, userId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 40) throw new Error("Display name must be 2 to 40 characters");
  await sql`update app_user set display_name = ${trimmed} where id = ${userId}`;
}
