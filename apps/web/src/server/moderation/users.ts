import type { Sql } from "postgres";
import { FORBIDDEN, getActor, type Actor } from "./actor";
import { audit, record } from "./audit";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES = ["moderator", "admin"] as const;
type Role = (typeof ROLES)[number];

async function adminActor(tx: Sql, userId: string): Promise<Actor | null> {
  const a = await getActor(tx, userId);
  return a?.role === "admin" ? a : null;
}

export async function grantRole(sql: Sql, i: { actorId: string; email: string; role: Role }): Promise<{ ok: true; userId: string } | { ok: false; reason: "forbidden" | "not_found" | "invalid" }> {
  return sql.begin(async (tx) => {
    const actor = await adminActor(tx as unknown as Sql, i.actorId);
    if (!actor) return FORBIDDEN;
    if (!ROLES.includes(i.role)) return { ok: false, reason: "invalid" } as const;
    const [u] = await tx`select id from app_user where email = ${String(i.email ?? "").trim().toLowerCase()} and status = 'active'`;
    if (!u) return { ok: false, reason: "not_found" } as const;
    await tx`insert into user_role (user_id, role, granted_by) values (${u.id}, ${i.role}, ${actor.id}) on conflict (user_id, role) do nothing`;
    await audit(tx, actor, { action: "grant_role", entityType: "user", entityId: u.id, after: { role: i.role } });
    return { ok: true, userId: u.id as string } as const;
  });
}

export async function revokeRole(sql: Sql, i: { actorId: string; userId: string; role: Role }): Promise<{ ok: true } | { ok: false; reason: "forbidden" | "not_found" | "invalid" | "self" }> {
  return sql.begin(async (tx) => {
    const actor = await adminActor(tx as unknown as Sql, i.actorId);
    if (!actor) return FORBIDDEN;
    if (!UUID.test(i.userId) || !ROLES.includes(i.role)) return { ok: false, reason: "invalid" } as const;
    if (i.userId === actor.id && i.role === "admin") return { ok: false, reason: "self" } as const;
    const gone = await tx`delete from user_role where user_id = ${i.userId} and role = ${i.role} returning user_id`;
    if (gone.length === 0) return { ok: false, reason: "not_found" } as const;
    await audit(tx, actor, { action: "revoke_role", entityType: "user", entityId: i.userId, before: { role: i.role } });
    return { ok: true } as const;
  });
}

export async function setSuspended(sql: Sql, i: { actorId: string; userId: string; suspended: boolean; reason: string }): Promise<{ ok: true } | { ok: false; reason: "forbidden" | "not_found" | "invalid" | "self" | "protected" }> {
  return sql.begin(async (tx) => {
    const actor = await adminActor(tx as unknown as Sql, i.actorId);
    if (!actor) return FORBIDDEN;
    const reason = String(i.reason ?? "").trim().slice(0, 1000);
    if (!UUID.test(i.userId) || !reason) return { ok: false, reason: "invalid" } as const;
    if (i.userId === actor.id) return { ok: false, reason: "self" } as const;
    const [u] = await tx`select id, status from app_user where id = ${i.userId} for update`;
    if (!u || u.status === "deleted") return { ok: false, reason: "not_found" } as const;
    const [admin] = await tx`select 1 from user_role where user_id = ${i.userId} and role = 'admin'`;
    if (admin) return { ok: false, reason: "protected" } as const;
    await tx`update app_user set status = ${i.suspended ? "suspended" : "active"} where id = ${i.userId}`;
    if (i.suspended) await tx`delete from auth_session where user_id = ${i.userId}`;
    const action = i.suspended ? "suspend_user" : "unsuspend_user";
    if (i.suspended) await record(tx, { subjectType: "user", subjectId: i.userId, moderatorId: actor.id, action: "suspend_user", comment: reason });
    await audit(tx, actor, { action, entityType: "user", entityId: i.userId, before: { status: u.status }, after: { status: i.suspended ? "suspended" : "active", reason } });
    return { ok: true } as const;
  });
}

export async function listRoleHolders(sql: Sql, actorId: string): Promise<{ ok: true; items: { userId: string; name: string; role: Role; grantedAt: string }[] } | typeof FORBIDDEN> {
  if (!(await adminActor(sql, actorId))) return FORBIDDEN;
  const rows = await sql`select r.user_id, u.display_name, r.role, r.granted_at from user_role r join app_user u on u.id = r.user_id order by r.granted_at`;
  return { ok: true, items: rows.map((r) => ({ userId: r.user_id, name: r.display_name, role: r.role, grantedAt: (r.granted_at as Date).toISOString() })) };
}
