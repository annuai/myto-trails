import { randomInt } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import { cleanBody, LINK } from "../community/comments";
import { isMember } from "../community/members";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HOUR = 3_600_000;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const MAX_RIDERS = 30;
const CREATES_PER_DAY = 5;
/** A group ride ends 12 hours after the last activity, and never lives longer than 72 hours. */
export const IDLE_MS = 12 * HOUR;
export const HARD_CAP_MS = 72 * HOUR;
/** A rider not heard from for this long has no position on the map. */
export const STALE_MS = 5 * 60_000;
const WRITE_GAP_MS = 5_000;
export const STATUSES = ["ok", "wait_up", "fuel", "break", "help"] as const;
export type RiderStatus = (typeof STATUSES)[number];

export function generateCode(rand: (n: number) => number = randomInt): string {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[rand(CODE_ALPHABET.length)]).join("");
}

/** The code as typed: spaces and case do not matter. Null when it cannot be a code. */
export function normalizeCode(v: unknown): string | null {
  const c = String(v ?? "").replace(/\s+/g, "").toUpperCase();
  return new RegExp(`^[${CODE_ALPHABET}]{6}$`).test(c) ? c : null;
}

export const expiresAt = (createdAt: Date, lastActivityAt: Date) => new Date(Math.min(lastActivityAt.getTime() + IDLE_MS, createdAt.getTime() + HARD_CAP_MS));
export const isExpired = (g: { createdAt: Date; lastActivityAt: Date; endedAt: Date | null }, now: Date) => g.endedAt !== null || now.getTime() >= expiresAt(g.createdAt, g.lastActivityAt).getTime();
/** A position is shown only while it is recent. */
export const isFresh = (seenAt: Date | null, now: Date) => seenAt !== null && now.getTime() - seenAt.getTime() < STALE_MS;

const name = (v: unknown, max: number) => {
  const s = cleanBody(v).replace(/\s*\n\s*/g, " ");
  return s.length >= 1 && s.length <= max && !LINK.test(s) ? s : null;
};
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const validLatLng = (lat: unknown, lng: unknown): lat is number => finite(lat) && finite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
const uniqueViolation = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";

type Fail<R extends string> = { ok: false; reason: R };

export async function createGroupRide(
  sql: Sql,
  i: { userId: string; name: string; clubId: string | null; now: Date },
): Promise<{ ok: true; id: string; code: string; name: string; expiresAt: string } | Fail<"not_member" | "invalid" | "not_found" | "rate_limited">> {
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  const rideName = name(i.name, 60);
  if (!rideName) return { ok: false, reason: "invalid" };
  return sql.begin(async (tx) => {
    let clubId: string | null = null;
    if (i.clubId) {
      if (!UUID.test(i.clubId)) return { ok: false, reason: "not_found" } as const;
      const [m] = await tx`
        select c.id from club c join club_member cm on cm.club_id = c.id
        where c.public_id = ${i.clubId} and c.archived_at is null and cm.user_id = ${i.userId}`;
      if (!m) return { ok: false, reason: "not_found" } as const;
      clubId = m.id as string;
    }
    const [hit] = await tx`select rate_limit_hit(${`group-create:${i.userId}`}, ${CREATES_PER_DAY}, 86400) as ok`;
    if (!hit!.ok) return { ok: false, reason: "rate_limited" } as const;
    const [u] = await tx`select display_name from app_user where id = ${i.userId}`;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      try {
        // A savepoint: a code that is already in use must not poison the whole transaction.
        const row = await tx.savepoint(async (sp) => {
          const [g] = await sp`
            insert into group_ride (code, name, leader_id, club_id, created_at, last_activity_at) values (${code}, ${rideName}, ${i.userId}, ${clubId}, ${i.now}, ${i.now}) returning id`;
          await sp`insert into group_ride_member (ride_id, user_id, display_name, role) values (${g!.id}, ${i.userId}, ${u!.display_name}, 'leader')`;
          return g!;
        });
        return { ok: true, id: row.id as string, code, name: rideName, expiresAt: expiresAt(i.now, i.now).toISOString() } as const;
      } catch (e) {
        if (!uniqueViolation(e)) throw e;
      }
    }
    return { ok: false, reason: "rate_limited" } as const;
  });
}

/** The group ride a club's member can join right now, if one of the club's riders started one. Members of the club only. */
export async function activeClubGroupRide(
  sql: Sql,
  i: { userId: string; clubId: string; now: Date },
): Promise<{ ok: true; ride: { id: string; name: string; code: string } | null } | Fail<"not_found">> {
  if (!UUID.test(i.clubId)) return { ok: false, reason: "not_found" };
  const [m] = await sql`
    select c.id from club c join club_member cm on cm.club_id = c.id
    where c.public_id = ${i.clubId} and c.archived_at is null and cm.user_id = ${i.userId}`;
  if (!m) return { ok: false, reason: "not_found" };
  const rows = await sql`select id, code, name, created_at, last_activity_at, ended_at from group_ride where club_id = ${m.id} and ended_at is null order by created_at desc limit 5`;
  const live = rows.find((g) => !isExpired({ createdAt: g.created_at, lastActivityAt: g.last_activity_at, endedAt: g.ended_at }, i.now));
  return { ok: true, ride: live ? { id: live.id as string, name: live.name as string, code: live.code as string } : null };
}

type Ride = { id: string; leaderId: string; name: string; createdAt: Date; lastActivityAt: Date; endedAt: Date | null };
async function findRide(sql: Sql, id: string): Promise<Ride | null> {
  if (!UUID.test(id)) return null;
  const [g] = await sql`select id, leader_id, name, created_at, last_activity_at, ended_at from group_ride where id = ${id}`;
  return g ? { id: g.id, leaderId: g.leader_id, name: g.name, createdAt: g.created_at, lastActivityAt: g.last_activity_at, endedAt: g.ended_at } : null;
}

/** Positions never outlive the ride. Called whenever an expired ride is touched, and by the scheduled sweep. */
async function wipe(sql: Sql | TransactionSql, rideId: string, now: Date) {
  await sql`update group_ride_member set lat = null, lng = null, seen_at = null where ride_id = ${rideId}`;
  await sql`update group_ride set regroup_lat = null, regroup_lng = null, regroup_note = null, ended_at = coalesce(ended_at, ${now}) where id = ${rideId}`;
}

export async function joinGroupRide(
  sql: Sql,
  i: { userId: string; code: string; displayName: string; now: Date },
): Promise<{ ok: true; id: string; name: string; role: "leader" | "member" } | Fail<"not_member" | "invalid" | "not_found" | "full">> {
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  const code = normalizeCode(i.code);
  if (!code) return { ok: false, reason: "not_found" };
  return sql.begin(async (tx) => {
    const [g] = await tx`select id, name, created_at, last_activity_at, ended_at from group_ride where code = ${code} and ended_at is null for update`;
    if (!g) return { ok: false, reason: "not_found" } as const;
    if (isExpired({ createdAt: g.created_at, lastActivityAt: g.last_activity_at, endedAt: g.ended_at }, i.now)) {
      await wipe(tx, g.id, i.now);
      return { ok: false, reason: "not_found" } as const;
    }
    const [mine] = await tx`select role, left_at from group_ride_member where ride_id = ${g.id} and user_id = ${i.userId}`;
    if (mine && mine.left_at === null) return { ok: true, id: g.id as string, name: g.name as string, role: mine.role as "leader" | "member" } as const;
    const [n] = await tx`select count(*)::int as n from group_ride_member where ride_id = ${g.id} and left_at is null`;
    if (n!.n >= MAX_RIDERS) return { ok: false, reason: "full" } as const;
    const [u] = await tx`select display_name from app_user where id = ${i.userId}`;
    const shown = String(i.displayName ?? "").trim() ? name(i.displayName, 40) : (u!.display_name as string);
    if (!shown) return { ok: false, reason: "invalid" } as const;
    if (mine) await tx`update group_ride_member set left_at = null, display_name = ${shown}, status = 'ok' where ride_id = ${g.id} and user_id = ${i.userId}`;
    else await tx`insert into group_ride_member (ride_id, user_id, display_name) values (${g.id}, ${i.userId}, ${shown})`;
    await tx`update group_ride set last_activity_at = ${i.now} where id = ${g.id}`;
    return { ok: true, id: g.id as string, name: g.name as string, role: (mine?.role ?? "member") as "leader" | "member" } as const;
  });
}

export type Rider = { id: string; name: string; role: "leader" | "member"; lat: number | null; lng: number | null; at: string | null; status: RiderStatus };
export type SyncResult = { me: string; riders: Rider[]; regroup: { lat: number; lng: number; note: string | null } | null; ended: boolean };

/**
 * One round trip: store my position and signal (at most once every 5 seconds), return everyone's. A rider's id is their
 * public handle, never the account id. Reading is never refused; only writing is limited.
 */
export async function syncGroupRide(
  sql: Sql,
  i: { userId: string; rideId: string; lat?: unknown; lng?: unknown; status?: unknown; now: Date },
): Promise<SyncResult | Fail<"not_found" | "invalid">> {
  const g = await findRide(sql, i.rideId);
  if (!g) return { ok: false, reason: "not_found" };
  const [me] = await sql`select m.left_at, u.public_id from group_ride_member m join app_user u on u.id = m.user_id where m.ride_id = ${g.id} and m.user_id = ${i.userId}`;
  if (!me || me.left_at !== null) return { ok: false, reason: "not_found" };
  const hasPos = i.lat !== undefined || i.lng !== undefined;
  if (hasPos && !validLatLng(i.lat, i.lng)) return { ok: false, reason: "invalid" };
  const status = i.status === undefined ? null : (STATUSES as readonly unknown[]).includes(i.status) ? (i.status as RiderStatus) : undefined;
  if (status === undefined) return { ok: false, reason: "invalid" };
  if (isExpired(g, i.now)) {
    if (g.endedAt === null) await wipe(sql, g.id, i.now);
    return { me: me.public_id, riders: [], regroup: null, ended: true };
  }
  if (hasPos || status) {
    await sql`
      update group_ride_member set
        lat = coalesce(${hasPos ? (i.lat as number) : null}, lat), lng = coalesce(${hasPos ? (i.lng as number) : null}, lng),
        seen_at = case when ${hasPos} then ${i.now}::timestamptz else seen_at end,
        status = coalesce(${status}, status), last_write_at = ${i.now}
      where ride_id = ${g.id} and user_id = ${i.userId} and (last_write_at is null or last_write_at <= ${new Date(i.now.getTime() - WRITE_GAP_MS)})`;
    await sql`update group_ride set last_activity_at = ${i.now} where id = ${g.id}`;
  }
  const rows = await sql`
    select u.public_id, m.display_name, m.role, m.lat, m.lng, m.seen_at, m.status
    from group_ride_member m join app_user u on u.id = m.user_id
    where m.ride_id = ${g.id} and m.left_at is null order by m.role desc, m.joined_at`;
  const [r] = await sql`select regroup_lat, regroup_lng, regroup_note from group_ride where id = ${g.id}`;
  return {
    me: me.public_id,
    riders: rows.map((m) => {
      const fresh = isFresh(m.seen_at, i.now);
      return { id: m.public_id, name: m.display_name, role: m.role, lat: fresh ? m.lat : null, lng: fresh ? m.lng : null, at: fresh ? (m.seen_at as Date).toISOString() : null, status: m.status };
    }),
    regroup: r?.regroup_lat !== null && r?.regroup_lat !== undefined ? { lat: r.regroup_lat, lng: r.regroup_lng, note: r.regroup_note } : null,
    ended: false,
  };
}

async function leaderOf(sql: Sql, rideId: string, userId: string, now: Date): Promise<Ride | Fail<"not_found" | "not_leader">> {
  const g = await findRide(sql, rideId);
  if (!g || isExpired(g, now)) return { ok: false, reason: "not_found" };
  return g.leaderId === userId ? g : { ok: false, reason: "not_leader" };
}

export async function setRegroup(sql: Sql, i: { userId: string; rideId: string; point: { lat: unknown; lng: unknown; note?: unknown } | null; now: Date }): Promise<{ ok: true } | Fail<"not_found" | "not_leader" | "invalid">> {
  const g = await leaderOf(sql, i.rideId, i.userId, i.now);
  if ("ok" in g) return g;
  if (i.point === null) {
    await sql`update group_ride set regroup_lat = null, regroup_lng = null, regroup_note = null where id = ${g.id}`;
    return { ok: true };
  }
  const note = i.point.note === undefined || i.point.note === "" ? null : name(i.point.note, 120);
  if (!validLatLng(i.point.lat, i.point.lng) || (note === null && i.point.note !== undefined && i.point.note !== "")) return { ok: false, reason: "invalid" };
  await sql`update group_ride set regroup_lat = ${i.point.lat as number}, regroup_lng = ${i.point.lng as number}, regroup_note = ${note}, last_activity_at = ${i.now} where id = ${g.id}`;
  return { ok: true };
}

/** A rider leaves and their position goes. The leader cannot leave: they end the ride. */
export async function leaveGroupRide(sql: Sql, i: { userId: string; rideId: string }): Promise<{ ok: true } | Fail<"not_found" | "leader">> {
  const g = await findRide(sql, i.rideId);
  if (!g) return { ok: false, reason: "not_found" };
  if (g.leaderId === i.userId && g.endedAt === null) return { ok: false, reason: "leader" };
  const rows = await sql`update group_ride_member set left_at = coalesce(left_at, now()), lat = null, lng = null, seen_at = null where ride_id = ${g.id} and user_id = ${i.userId} returning user_id`;
  return rows.length ? { ok: true } : { ok: false, reason: "not_found" };
}

export async function endGroupRide(sql: Sql, i: { userId: string; rideId: string; now: Date }): Promise<{ ok: true } | Fail<"not_found" | "not_leader">> {
  const g = await leaderOf(sql, i.rideId, i.userId, i.now);
  if ("ok" in g) return g;
  await wipe(sql, g.id, i.now);
  return { ok: true };
}

/** Scheduled sweep: ends rides past their time and wipes every position they held. */
export async function sweepGroupRides(sql: Sql, now: Date): Promise<number> {
  const rows = await sql`
    select id from group_ride where ended_at is null
      and (last_activity_at <= ${new Date(now.getTime() - IDLE_MS)} or created_at <= ${new Date(now.getTime() - HARD_CAP_MS)})`;
  for (const r of rows) await wipe(sql, r.id as string, now);
  return rows.length;
}
