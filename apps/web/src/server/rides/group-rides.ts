import { randomInt } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import { cleanBody, LINK } from "../community/comments";
import { isMember } from "../community/members";
import { capacityConfig, limitFor, planFor, upgradeOptions, type EntitlementRow, type Plan } from "./capacity";
import { leaderDroppedOff, leaderQuietFor15, mayTakeLead, pickSuccessor, type Candidate } from "./lead";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HOUR = 3_600_000;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/** How many riders one group ride holds. A sync carries everyone's position, so a full group costs about 22 KB a poll to each rider. */
export const MAX_RIDERS = 100;

async function capacityOf(sql: Sql | TransactionSql, rideId: string, leaderId: string, used: number, now: Date) {
  const plan = await ridePlan(sql, rideId, leaderId, now);
  return { plan, limit: limitFor(plan), used, upgrades: upgradeOptions(plan, capacityConfig()) };
}

/** What this ride's leader has paid for or been given, read on the server inside the same transaction that counts the riders. */
async function ridePlan(sql: Sql | TransactionSql, rideId: string, leaderId: string, now: Date): Promise<Plan> {
  const rows = await sql`select kind, ride_id, status, starts_at, ends_at from entitlement where user_id = ${leaderId} and status = 'active' and (ride_id is null or ride_id = ${rideId})`;
  const ents: EntitlementRow[] = rows.map((e) => ({ kind: e.kind, rideId: e.ride_id, status: e.status, startsAt: e.starts_at, endsAt: e.ends_at }));
  return planFor(rideId, ents, now);
}
const CREATES_PER_DAY = 5;
/** A code is six characters, so the number of tries is what keeps it from being guessed. */
const JOIN_TRIES_PER_HOUR = 20;
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
): Promise<{ ok: true; id: string; name: string; role: "leader" | "member" } | Fail<"not_member" | "invalid" | "not_found" | "full" | "too_many_tries">> {
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  const code = normalizeCode(i.code);
  if (!code) return { ok: false, reason: "not_found" };
  return sql.begin(async (tx) => {
    const [hit] = await tx`select rate_limit_hit(${`group-join:${i.userId}`}, ${JOIN_TRIES_PER_HOUR}, 3600) as ok`;
    if (!hit!.ok) return { ok: false, reason: "too_many_tries" } as const;
    const [g] = await tx`select id, name, leader_id, created_at, last_activity_at, ended_at from group_ride where code = ${code} and ended_at is null for update`;
    if (!g) return { ok: false, reason: "not_found" } as const;
    if (isExpired({ createdAt: g.created_at, lastActivityAt: g.last_activity_at, endedAt: g.ended_at }, i.now)) {
      await wipe(tx, g.id, i.now);
      return { ok: false, reason: "not_found" } as const;
    }
    const [mine] = await tx`select role, left_at from group_ride_member where ride_id = ${g.id} and user_id = ${i.userId}`;
    if (mine && mine.left_at === null) return { ok: true, id: g.id as string, name: g.name as string, role: mine.role as "leader" | "member" } as const;
    const [n] = await tx`select count(*)::int as n from group_ride_member where ride_id = ${g.id} and left_at is null`;
    if (n!.n >= limitFor(await ridePlan(tx, g.id, g.leader_id, i.now))) return { ok: false, reason: "full" } as const;
    const [u] = await tx`select display_name from app_user where id = ${i.userId}`;
    const shown = String(i.displayName ?? "").trim() ? name(i.displayName, 40) : (u!.display_name as string);
    if (!shown) return { ok: false, reason: "invalid" } as const;
    if (mine) await tx`update group_ride_member set left_at = null, home_at = null, display_name = ${shown}, status = 'ok' where ride_id = ${g.id} and user_id = ${i.userId}`;
    else await tx`insert into group_ride_member (ride_id, user_id, display_name) values (${g.id}, ${i.userId}, ${shown})`;
    await tx`update group_ride set last_activity_at = ${i.now} where id = ${g.id}`;
    return { ok: true, id: g.id as string, name: g.name as string, role: (mine?.role ?? "member") as "leader" | "member" } as const;
  });
}

export type Rider = { id: string; name: string; role: "leader" | "member"; eventRole: "captain" | "marshal" | "medic" | "sweep" | null; /** The titles the rider holds, the leader's list or else the one an event gave them. */ titles: RiderTitle[]; lat: number | null; lng: number | null; at: string | null; status: RiderStatus; /** The rider told the group they got home. Such a rider stays on the list, with no position. */ home: boolean };
export type SyncResult = {
  me: string; riders: Rider[]; regroup: { lat: number; lng: number; note: string | null } | null; ended: boolean; stretchKm: number;
  /** The leader's backup, shown to the leader only. */
  successor?: string | null;
  /** The leader is out of contact and this rider may take the lead (they are the backup, a marshal or a captain). */
  canTakeLead?: boolean;
  /** The lead was taken from this rider because they dropped off, and they may take it back. */
  canTakeBack?: boolean;
  /** The leader's own view of the ride's size, and what would raise it. Absent for everyone else. */
  capacity?: { plan: Plan; limit: number; used: number; upgrades: ReturnType<typeof upgradeOptions> };
};

/**
 * One round trip: store my position and signal (at most once every 5 seconds), return everyone's. A rider's id is their
 * public handle, never the account id. Reading is never refused; only writing is limited.
 */
export async function syncGroupRide(
  sql: Sql,
  i: { userId: string; rideId: string; lat?: unknown; lng?: unknown; status?: unknown; /** The phone's battery, 0 to 100, and whether it is charging. */ battery?: unknown; charging?: unknown; now: Date },
): Promise<SyncResult | Fail<"not_found" | "invalid">> {
  const g = await findRide(sql, i.rideId);
  if (!g) return { ok: false, reason: "not_found" };
  const [me] = await sql`select m.left_at, u.public_id from group_ride_member m join app_user u on u.id = m.user_id where m.ride_id = ${g.id} and m.user_id = ${i.userId}`;
  if (!me || me.left_at !== null) return { ok: false, reason: "not_found" };
  const hasPos = i.lat !== undefined || i.lng !== undefined;
  if (hasPos && !validLatLng(i.lat, i.lng)) return { ok: false, reason: "invalid" };
  const status = i.status === undefined ? null : (STATUSES as readonly unknown[]).includes(i.status) ? (i.status as RiderStatus) : undefined;
  if (status === undefined) return { ok: false, reason: "invalid" };
  const battery = i.battery === undefined ? null : Number.isInteger(i.battery) && (i.battery as number) >= 0 && (i.battery as number) <= 100 ? (i.battery as number) : undefined;
  const charging = i.charging === undefined ? null : typeof i.charging === "boolean" ? i.charging : undefined;
  if (battery === undefined || charging === undefined) return { ok: false, reason: "invalid" };
  if (isExpired(g, i.now)) {
    if (g.endedAt === null) await wipe(sql, g.id, i.now);
    return { me: me.public_id, riders: [], regroup: null, ended: true, stretchKm: 3 };
  }
  if (hasPos || status || battery !== null) {
    await sql`
      update group_ride_member set
        lat = coalesce(${hasPos ? (i.lat as number) : null}, lat), lng = coalesce(${hasPos ? (i.lng as number) : null}, lng),
        seen_at = case when ${hasPos} then ${i.now}::timestamptz else seen_at end,
        status = coalesce(${status}, status), battery = coalesce(${battery}, battery), charging = coalesce(${charging}, charging), last_write_at = ${i.now}
      where ride_id = ${g.id} and user_id = ${i.userId} and (last_write_at is null or last_write_at <= ${new Date(i.now.getTime() - WRITE_GAP_MS)})`;
    await sql`update group_ride set last_activity_at = ${i.now} where id = ${g.id}`;
  }
  // A leader whose phone has gone quiet with a low battery loses the lead to the next in line, whoever's sync finds it.
  await promoteIfDroppedOff(sql, g.id, i.now);
  const rows = await sql`
    select u.public_id, m.user_id, m.joined_at, m.left_at, m.display_name, m.role, m.event_role, m.titles, m.lat, m.lng, m.seen_at, m.status, m.home_at
    from group_ride_member m join app_user u on u.id = m.user_id
    where m.ride_id = ${g.id} and (m.left_at is null or m.home_at is not null) order by m.role desc, m.joined_at`;
  const [r] = await sql`select regroup_lat, regroup_lng, regroup_note, stretch_km, leader_id, successor_id, previous_leader_id from group_ride where id = ${g.id}`;
  const mine = rows.find((m) => m.user_id === i.userId);
  const leaderRow = rows.find((m) => m.user_id === r?.leader_id);
  const myTitles = mine ? (mine.titles.length ? mine.titles : mine.event_role ? [mine.event_role] : []) : [];
  const iLead = r?.leader_id === i.userId;
  return {
    me: me.public_id,
    riders: rows.map((m) => {
      const fresh = isFresh(m.seen_at, i.now);
      return { id: m.public_id, name: m.display_name, role: m.role, eventRole: m.event_role, titles: m.titles.length ? m.titles : m.event_role ? [m.event_role] : [], lat: fresh ? m.lat : null, lng: fresh ? m.lng : null, at: fresh ? (m.seen_at as Date).toISOString() : null, status: m.status, home: m.home_at !== null };
    }),
    regroup: r?.regroup_lat !== null && r?.regroup_lat !== undefined ? { lat: r.regroup_lat, lng: r.regroup_lng, note: r.regroup_note } : null,
    ended: false,
    stretchKm: r?.stretch_km ?? 3,
    successor: iLead ? (rows.find((m) => m.user_id === r?.successor_id)?.public_id ?? null) : null,
    canTakeLead: !iLead && !!leaderRow && leaderQuietFor15(leaderRow.seen_at, leaderRow.joined_at, i.now) && mayTakeLead({ userId: i.userId, titles: myTitles }, r?.successor_id ?? null),
    canTakeBack: r?.previous_leader_id === i.userId && !iLead,
    // Only the organiser sees this: it is what the "ride is full" prompt is built from. Riders never see a price.
    capacity: iLead ? await capacityOf(sql, g.id, i.userId, rows.filter((m) => m.left_at === null).length, i.now) : undefined,
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

/** The jobs a leader can give a rider on a group ride, the same as an event's roles. */
export const RIDER_TITLES = ["captain", "marshal", "medic", "sweep"] as const;
export type RiderTitle = (typeof RIDER_TITLES)[number];

/**
 * The titles from a request: a list of the jobs, in their usual order with repeats dropped; an empty list takes them all away. Undefined when
 * it is not a list, or holds anything that is not one of the four jobs.
 */
export function parseTitles(v: unknown): RiderTitle[] | undefined {
  if (!Array.isArray(v) || v.length > RIDER_TITLES.length * 2) return undefined;
  if (!v.every((t) => typeof t === "string" && (RIDER_TITLES as readonly string[]).includes(t))) return undefined;
  return RIDER_TITLES.filter((t) => v.includes(t));
}

/** The leader gives a rider titles (any of captain, marshal, medic, sweep, together) or takes them all away. `rider` is the rider's public id, as the sync shows it. */
export async function setRiderTitles(sql: Sql, i: { userId: string; rideId: string; rider: unknown; titles: unknown; now: Date }): Promise<{ ok: true } | Fail<"not_found" | "not_leader" | "invalid">> {
  const g = await leaderOf(sql, i.rideId, i.userId, i.now);
  if ("ok" in g) return g;
  const titles = parseTitles(i.titles);
  // A rider's public id is a UUID; anything else is a bad request, not a query that fails inside the database.
  if (titles === undefined || typeof i.rider !== "string" || !UUID.test(i.rider)) return { ok: false, reason: "invalid" };
  const rows = await sql`
    update group_ride_member set titles = ${sql.array(titles)}, event_role = null
    where ride_id = ${g.id} and left_at is null and user_id = (select id from app_user where public_id = ${i.rider}) returning user_id`;
  if (!rows.length) return { ok: false, reason: "not_found" };
  await sql`update group_ride set last_activity_at = ${i.now} where id = ${g.id}`;
  return { ok: true };
}

type Db = Sql | TransactionSql;

/** The ride, locked for the rest of the transaction, so two lead changes at once cannot both happen. */
async function lockRide(tx: Db, id: string): Promise<Ride | null> {
  if (!UUID.test(id)) return null;
  const [g] = await tx`select id, leader_id, name, created_at, last_activity_at, ended_at from group_ride where id = ${id} for update`;
  return g ? { id: g.id, leaderId: g.leader_id, name: g.name, createdAt: g.created_at, lastActivityAt: g.last_activity_at, endedAt: g.ended_at } : null;
}

/** The user id of a rider still in the ride, from their public id. "invalid" when it is not an id. */
async function activeRider(tx: Db, rideId: string, rider: unknown): Promise<string | null | "invalid"> {
  if (typeof rider !== "string" || !UUID.test(rider)) return "invalid";
  const [m] = await tx`select m.user_id from group_ride_member m join app_user u on u.id = m.user_id where m.ride_id = ${rideId} and m.left_at is null and u.public_id = ${rider}`;
  return m ? (m.user_id as string) : null;
}

/** The lead changes hands: one leader, always. `previous` is who it was taken from if they dropped off (so they can take it back), else null. */
async function transferLead(tx: Db, rideId: string, from: string, to: string, o: { previous: string | null; now: Date }) {
  await tx`update group_ride set leader_id = ${to}, successor_id = null, previous_leader_id = ${o.previous}, last_activity_at = ${o.now} where id = ${rideId}`;
  await tx`update group_ride_member set role = 'member' where ride_id = ${rideId} and user_id = ${from}`;
  await tx`update group_ride_member set role = 'leader' where ride_id = ${rideId} and user_id = ${to}`;
}

type LeadFail = Fail<"not_found" | "not_leader" | "invalid">;

/** The leader passes the lead to a rider of the ride, at once. The leader becomes a rider. */
export async function passLead(sql: Sql, i: { userId: string; rideId: string; rider: unknown; now: Date }): Promise<{ ok: true } | LeadFail> {
  return sql.begin(async (tx) => {
    const g = await lockRide(tx, i.rideId);
    if (!g || isExpired(g, i.now)) return { ok: false, reason: "not_found" } as const;
    if (g.leaderId !== i.userId) return { ok: false, reason: "not_leader" } as const;
    const to = await activeRider(tx, g.id, i.rider);
    if (to === "invalid" || to === i.userId) return { ok: false, reason: "invalid" } as const;
    if (to === null) return { ok: false, reason: "not_found" } as const;
    await transferLead(tx, g.id, i.userId, to, { previous: null, now: i.now });
    return { ok: true } as const;
  });
}

/** The leader names the rider who leads if their phone dies, or clears the choice with null. Only the leader sees it. */
export async function setSuccessor(sql: Sql, i: { userId: string; rideId: string; rider: unknown; now: Date }): Promise<{ ok: true } | LeadFail> {
  const g = await leaderOf(sql, i.rideId, i.userId, i.now);
  if ("ok" in g) return g;
  if (i.rider === null) { await sql`update group_ride set successor_id = null where id = ${g.id}`; return { ok: true }; }
  const to = await activeRider(sql, g.id, i.rider);
  if (to === "invalid" || to === i.userId) return { ok: false, reason: "invalid" };
  if (to === null) return { ok: false, reason: "not_found" };
  await sql`update group_ride set successor_id = ${to} where id = ${g.id}`;
  return { ok: true };
}

/** Someone next in line takes the lead from a leader who has been out of contact for 15 minutes. The old leader may take it back. */
export async function takeLead(sql: Sql, i: { userId: string; rideId: string; now: Date }): Promise<{ ok: true } | Fail<"not_found" | "not_allowed">> {
  return sql.begin(async (tx) => {
    const g = await lockRide(tx, i.rideId);
    if (!g || isExpired(g, i.now)) return { ok: false, reason: "not_found" } as const;
    const [me] = await tx`select m.titles, m.event_role from group_ride_member m where m.ride_id = ${g.id} and m.user_id = ${i.userId} and m.left_at is null`;
    if (!me || g.leaderId === i.userId) return { ok: false, reason: "not_found" } as const;
    const [l] = await tx`select seen_at, joined_at from group_ride_member where ride_id = ${g.id} and user_id = ${g.leaderId}`;
    const [r] = await tx`select successor_id from group_ride where id = ${g.id}`;
    const titles = me.titles.length ? me.titles : me.event_role ? [me.event_role] : [];
    if (!l || !leaderQuietFor15(l.seen_at, l.joined_at, i.now) || !mayTakeLead({ userId: i.userId, titles }, r?.successor_id ?? null)) return { ok: false, reason: "not_allowed" } as const;
    await transferLead(tx, g.id, g.leaderId, i.userId, { previous: g.leaderId, now: i.now });
    return { ok: true } as const;
  });
}

/** The leader the lead was taken from comes back and takes it again, at once. */
export async function takeBack(sql: Sql, i: { userId: string; rideId: string; now: Date }): Promise<{ ok: true } | Fail<"not_found" | "not_allowed">> {
  return sql.begin(async (tx) => {
    const g = await lockRide(tx, i.rideId);
    if (!g || isExpired(g, i.now)) return { ok: false, reason: "not_found" } as const;
    const [r] = await tx`select previous_leader_id from group_ride where id = ${g.id}`;
    const [m] = await tx`select 1 as ok from group_ride_member where ride_id = ${g.id} and user_id = ${i.userId} and left_at is null`;
    if (!m || r?.previous_leader_id !== i.userId || g.leaderId === i.userId) return { ok: false, reason: "not_allowed" } as const;
    await transferLead(tx, g.id, g.leaderId, i.userId, { previous: null, now: i.now });
    return { ok: true } as const;
  });
}

/**
 * A leader quiet for 10 minutes whose last reported battery was low and not charging has dropped off: the lead goes to the next in line (see
 * pickSuccessor), who is told, and the old leader can take it back. A leader who only lost signal is never judged this way. Checked on every
 * sync, so no schedule is needed.
 */
async function promoteIfDroppedOff(sql: Sql, rideId: string, now: Date) {
  const [l] = await sql`
    select g.leader_id, m.seen_at, m.battery, m.charging from group_ride g join group_ride_member m on m.ride_id = g.id and m.user_id = g.leader_id
    where g.id = ${rideId} and g.ended_at is null`;
  if (!l || !leaderDroppedOff({ seenAt: l.seen_at, battery: l.battery, charging: l.charging }, now)) return;
  await sql.begin(async (tx) => {
    const g = await lockRide(tx, rideId);
    if (!g || g.leaderId !== l.leader_id) return; // someone else changed it first
    const [r] = await tx`select successor_id from group_ride where id = ${g.id}`;
    const rows = await tx`select user_id, titles, event_role, joined_at, seen_at from group_ride_member where ride_id = ${g.id} and left_at is null`;
    const people: Candidate[] = rows.map((m) => ({ userId: m.user_id as string, titles: m.titles.length ? m.titles : m.event_role ? [m.event_role] : [], joinedAt: m.joined_at as Date, seenAt: m.seen_at as Date | null }));
    const next = pickSuccessor(people, { successorId: r?.successor_id ?? null, leaderId: g.leaderId, now });
    if (next) await transferLead(tx, g.id, g.leaderId, next.userId, { previous: g.leaderId, now });
  });
}

/** A rider leaves and their position goes. The leader cannot leave without passing the lead: with `successor` (a rider's public id) the lead passes and the leaving is one step; without, they end the ride instead. */
export async function leaveGroupRide(sql: Sql, i: { userId: string; rideId: string; successor?: unknown; now?: Date }): Promise<{ ok: true } | Fail<"not_found" | "leader" | "invalid">> {
  const now = i.now ?? new Date();
  return sql.begin(async (tx) => {
    const g = await lockRide(tx, i.rideId);
    if (!g) return { ok: false, reason: "not_found" } as const;
    if (g.leaderId === i.userId && g.endedAt === null) {
      if (i.successor === undefined || i.successor === null) return { ok: false, reason: "leader" } as const;
      const to = await activeRider(tx, g.id, i.successor);
      if (to === "invalid" || to === i.userId) return { ok: false, reason: "invalid" } as const;
      if (to === null) return { ok: false, reason: "not_found" } as const;
      await transferLead(tx, g.id, i.userId, to, { previous: null, now });
    }
    const rows = await tx`update group_ride_member set left_at = coalesce(left_at, now()), lat = null, lng = null, seen_at = null, battery = null, charging = false where ride_id = ${g.id} and user_id = ${i.userId} returning user_id`;
    return rows.length ? ({ ok: true } as const) : ({ ok: false, reason: "not_found" } as const);
  });
}

/**
 * A rider tells the group they got home. It works whether they are still in the group or have already left it (a rider who ends their
 * ride leaves), so the others see "Home" and not a rider who went quiet. Only the moment is kept. Said again, it keeps the first time.
 */
export async function markHome(sql: Sql, i: { userId: string; rideId: string; now: Date }): Promise<{ ok: true } | Fail<"not_found">> {
  const g = await findRide(sql, i.rideId);
  if (!g || isExpired(g, i.now)) return { ok: false, reason: "not_found" };
  const rows = await sql`update group_ride_member set home_at = coalesce(home_at, ${i.now}) where ride_id = ${g.id} and user_id = ${i.userId} returning user_id`;
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
