import type { Sql, TransactionSql } from "postgres";
import type { DeclineReason, EventInput, EventResponse, EventRole, EventStatus, RideEvent, RideEventDetail, RosterRow } from "@moto-trails/domain";
import { DEFAULT_TIME_ZONE } from "@/lib/time-zone";
import { createGroupRide, joinGroupRide } from "../rides/group-rides";
import { cleanBody, LINK } from "./comments";
import { checkInVerdict, seatDecision, validStart, type CheckInVerdict } from "./eventRules";
import { isMember } from "./members";

type Db = Sql | TransactionSql;
type Fail<R extends string> = { ok: false; reason: R };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HOUR = 3_600_000;
const EVENTS_PER_DAY = 5;
const LIST_MAX = 50;
const REASONS: readonly DeclineReason[] = ["work", "bike", "distance", "other"];
const ROLES: readonly EventRole[] = ["captain", "marshal", "medic", "sweep"];
const line = (v: unknown, max: number, min = 1) => {
  const s = cleanBody(v).replace(/\s*\n\s*/g, " ");
  return s.length >= min && s.length <= max && !LINK.test(s) ? s : null;
};
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// ---- reading -----------------------------------------------------------------------------------------------

type Row = Record<string, any>;

/** An event is visible to anyone when open, and otherwise to its host and its club's members. Unknown and hidden look identical. */
const visibleTo = (sql: Db, userId: string) => sql`(e.audience = 'open' or e.host_id = ${userId} or exists (select 1 from club_member cm where cm.club_id = e.club_id and cm.user_id = ${userId}))`;

function statusOf(r: Row, now: Date): EventStatus {
  if (r.status === "cancelled") return "cancelled";
  if (r.status === "live") return r.ride_ended_at ? "ended" : "live";
  return now.getTime() - (r.starts_at as Date).getTime() > 6 * HOUR ? "ended" : "scheduled";
}

const listRow = (r: Row, userId: string, now: Date): RideEvent => ({
  id: r.public_id, title: r.title, startsAt: (r.starts_at as Date).toISOString(), timeZone: r.time_zone, placeName: r.place_name, audience: r.audience, status: statusOf(r, now),
  clubId: r.club_public_id ?? null, clubName: r.club_name ?? null, hostName: r.host_name, going: r.going, capacity: r.capacity, myResponse: r.my_response ?? null, mine: r.host_id === userId,
});

const SELECT = (sql: Db, userId: string) => sql`
  select e.*, g.ended_at as ride_ended_at, c.public_id as club_public_id, c.name as club_name, h.display_name as host_name,
    (select count(*)::int from ride_event_rsvp x where x.event_id = e.id and x.response = 'going') as going,
    (select x.response from ride_event_rsvp x where x.event_id = e.id and x.user_id = ${userId}) as my_response
  from ride_event e join app_user h on h.id = e.host_id left join club c on c.id = e.club_id left join group_ride g on g.id = e.group_ride_id`;
const UPCOMING = (sql: Db, now: Date) => sql`((e.status = 'scheduled' and e.starts_at > ${new Date(now.getTime() - 6 * HOUR)}) or (e.status = 'live' and g.ended_at is null))`;

export type EventScope = "discover" | "club" | "mine";

/** Upcoming and live events, soonest first. `discover` is the open ones; `club` is one club's; `mine` is those I host or answered. */
export async function listEvents(
  sql: Sql,
  i: { userId: string; scope: EventScope; clubId?: string; limit?: number; now: Date },
): Promise<{ ok: true; items: RideEvent[] } | Fail<"not_found">> {
  const limit = Math.min(Math.max(i.limit ?? 30, 1), LIST_MAX);
  let rows: Row[];
  if (i.scope === "club") {
    if (!i.clubId || !UUID.test(i.clubId)) return { ok: false, reason: "not_found" };
    rows = await sql`${SELECT(sql, i.userId)} where c.public_id = ${i.clubId} and c.archived_at is null and ${visibleTo(sql, i.userId)} and ${UPCOMING(sql, i.now)} order by e.starts_at limit ${limit}`;
  } else if (i.scope === "mine") {
    rows = await sql`${SELECT(sql, i.userId)} where (e.host_id = ${i.userId} or exists (select 1 from ride_event_rsvp m where m.event_id = e.id and m.user_id = ${i.userId} and m.response <> 'declined')) and ${UPCOMING(sql, i.now)} order by e.starts_at limit ${limit}`;
  } else {
    rows = await sql`${SELECT(sql, i.userId)} where e.audience = 'open' and ${UPCOMING(sql, i.now)} order by e.starts_at limit ${limit}`;
  }
  return { ok: true, items: rows.map((r) => listRow(r, i.userId, i.now)) };
}

export async function getEvent(sql: Sql, i: { userId: string; eventId: string; now: Date }): Promise<{ ok: true; event: RideEventDetail } | Fail<"not_found">> {
  if (!UUID.test(i.eventId)) return { ok: false, reason: "not_found" };
  const [r] = await sql`${SELECT(sql, i.userId)} where e.public_id = ${i.eventId} and ${visibleTo(sql, i.userId)}`;
  if (!r) return { ok: false, reason: "not_found" };
  const [n] = await sql`
    select count(*) filter (where response = 'maybe')::int as maybe, count(*) filter (where response = 'waitlisted')::int as waitlisted, count(*) filter (where checked_in_at is not null)::int as checked
    from ride_event_rsvp where event_id = ${r.id}`;
  const [mine] = await sql`select checked_in_at, role from ride_event_rsvp where event_id = ${r.id} and user_id = ${i.userId}`;
  const host = r.host_id === i.userId;
  let roster: RosterRow[] | null = null;
  if (host) {
    const rows = await sql`
      select u.public_id, u.display_name, x.response, x.reason, x.note, x.checked_in_at, x.role
      from ride_event_rsvp x join app_user u on u.id = x.user_id where x.event_id = ${r.id} order by x.created_at`;
    roster = rows.map((x) => ({ id: x.public_id, name: x.display_name, response: x.response, reason: x.reason, note: x.note, checkedIn: x.checked_in_at !== null, role: x.role }));
  }
  const status = statusOf(r, i.now);
  return {
    ok: true,
    event: {
      ...listRow(r, i.userId, i.now), description: r.description, lat: r.lat, lng: r.lng, radiusM: r.radius_m, maybe: n!.maybe, waitlisted: n!.waitlisted, checkedInCount: n!.checked,
      checkedIn: mine?.checked_in_at != null, myRole: mine?.role ?? null, rideLive: status === "live", roster,
    },
  };
}

// ---- creating ----------------------------------------------------------------------------------------------

export function parseEventInput(b: Record<string, unknown>, now: Date): { ok: true; v: Required<Omit<EventInput, "clubId" | "capacity">> & { clubId: string | null; capacity: number | null; startsAtDate: Date } } | Fail<"invalid"> {
  const title = line(b.title, 80, 3);
  const place = line(b.placeName, 120);
  const description = b.description === undefined || b.description === "" ? "" : cleanBody(b.description);
  const startsAt = typeof b.startsAt === "string" ? new Date(b.startsAt) : null;
  const radius = b.radiusM === undefined ? 150 : b.radiusM;
  const capacity = b.capacity === undefined || b.capacity === null ? null : b.capacity;
  const clubId = b.clubId === undefined || b.clubId === null ? null : b.clubId;
  const audience = b.audience;
  const timeZone = typeof b.timeZone === "string" && b.timeZone ? b.timeZone : DEFAULT_TIME_ZONE;
  if (!title || !place || description.length > 500 || LINK.test(description)) return { ok: false, reason: "invalid" };
  if (!startsAt || Number.isNaN(startsAt.getTime()) || !validStart(startsAt, now)) return { ok: false, reason: "invalid" };
  if (!finite(b.lat) || !finite(b.lng) || Math.abs(b.lat) > 90 || Math.abs(b.lng) > 180) return { ok: false, reason: "invalid" };
  if (!Number.isInteger(radius) || (radius as number) < 100 || (radius as number) > 500) return { ok: false, reason: "invalid" };
  if (capacity !== null && !(Number.isInteger(capacity) && (capacity as number) >= 2 && (capacity as number) <= 200)) return { ok: false, reason: "invalid" };
  if (audience !== "open" && audience !== "members") return { ok: false, reason: "invalid" };
  if (clubId !== null && (typeof clubId !== "string" || !UUID.test(clubId))) return { ok: false, reason: "invalid" };
  if (audience === "members" && clubId === null) return { ok: false, reason: "invalid" };
  return {
    ok: true,
    v: { title, description, startsAt: startsAt.toISOString(), startsAtDate: startsAt, timeZone, placeName: place, lat: b.lat, lng: b.lng, radiusM: radius as number, audience, capacity: capacity as number | null, clubId: clubId as string | null },
  };
}

/** A rider hosts an open event; a club's admin hosts one for the club, open or for its members only. */
export async function createEvent(
  sql: Sql,
  i: { userId: string; input: NonNullable<ReturnType<typeof parseEventInput> & { ok: true }>["v"]; now: Date },
): Promise<{ ok: true; id: string } | Fail<"not_member" | "not_found" | "not_admin" | "rate_limited">> {
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  const v = i.input;
  return sql.begin(async (tx) => {
    let clubId: string | null = null;
    if (v.clubId) {
      const [m] = await tx`select c.id, cm.role from club c join club_member cm on cm.club_id = c.id where c.public_id = ${v.clubId} and c.archived_at is null and cm.user_id = ${i.userId}`;
      if (!m) return { ok: false, reason: "not_found" } as const;
      if (m.role !== "admin") return { ok: false, reason: "not_admin" } as const;
      clubId = m.id as string;
    }
    const [hit] = await tx`select rate_limit_hit(${`event-create:${i.userId}`}, ${EVENTS_PER_DAY}, 86400) as ok`;
    if (!hit!.ok) return { ok: false, reason: "rate_limited" } as const;
    const [e] = await tx`
      insert into ride_event (host_id, club_id, title, description, starts_at, time_zone, place_name, lat, lng, radius_m, audience, capacity)
      values (${i.userId}, ${clubId}, ${v.title}, ${v.description}, ${v.startsAtDate}, ${v.timeZone}, ${v.placeName}, ${v.lat}, ${v.lng}, ${v.radiusM}, ${v.audience}, ${v.capacity})
      returning id, public_id`;
    await tx`insert into ride_event_rsvp (event_id, user_id, response) values (${e!.id}, ${i.userId}, 'going')`;
    return { ok: true, id: e!.public_id as string } as const;
  });
}

// ---- replying ----------------------------------------------------------------------------------------------

type Locked = { id: string; hostId: string; status: string; startsAt: Date; capacity: number | null; lat: number; lng: number; radiusM: number; groupRideId: string | null; ended: boolean };
/** The event row, locked for the rest of the transaction so seats are counted one reply at a time. Null when hidden or missing. */
async function lockEvent(tx: Db, userId: string, eventId: string): Promise<Locked | null> {
  if (!UUID.test(eventId)) return null;
  const [e] = await tx`
    select e.id, e.host_id, e.status, e.starts_at, e.capacity, e.lat, e.lng, e.radius_m, e.group_ride_id, (g.ended_at is not null) as ended
    from ride_event e left join group_ride g on g.id = e.group_ride_id
    where e.public_id = ${eventId} and ${visibleTo(tx, userId)} for update of e`;
  return e ? { id: e.id, hostId: e.host_id, status: e.status, startsAt: e.starts_at, capacity: e.capacity, lat: e.lat, lng: e.lng, radiusM: e.radius_m, groupRideId: e.group_ride_id, ended: e.ended } : null;
}
const open = (e: Locked, now: Date) => (e.status === "scheduled" && now.getTime() - e.startsAt.getTime() <= 6 * HOUR) || (e.status === "live" && !e.ended);

async function goingCount(tx: Db, eventId: string, except?: string) {
  const [n] = await tx`select count(*)::int as n from ride_event_rsvp where event_id = ${eventId} and response = 'going' and user_id <> ${except ?? "00000000-0000-0000-0000-000000000000"}`;
  return n!.n as number;
}

/** A seat has opened: the rider who has waited longest gets it. */
async function promote(tx: Db, e: Locked) {
  if (e.capacity === null) return;
  while ((await goingCount(tx, e.id)) < e.capacity) {
    const [w] = await tx`select user_id from ride_event_rsvp where event_id = ${e.id} and response = 'waitlisted' order by updated_at limit 1`;
    if (!w) return;
    await tx`update ride_event_rsvp set response = 'going', updated_at = now() where event_id = ${e.id} and user_id = ${w.user_id}`;
  }
}

export async function respond(
  sql: Sql,
  i: { userId: string; eventId: string; response: unknown; reason?: unknown; note?: unknown; now: Date },
): Promise<{ ok: true; response: EventResponse } | Fail<"not_member" | "not_found" | "invalid" | "closed" | "host">> {
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  if (i.response !== "going" && i.response !== "maybe" && i.response !== "declined") return { ok: false, reason: "invalid" };
  const response = i.response;
  const reason = response === "declined" && i.reason !== undefined && i.reason !== null ? i.reason : null;
  if (reason !== null && !REASONS.includes(reason as DeclineReason)) return { ok: false, reason: "invalid" };
  const note = response === "declined" && typeof i.note === "string" && i.note.trim() ? line(i.note, 200) : null;
  if (response === "declined" && typeof i.note === "string" && i.note.trim() && note === null) return { ok: false, reason: "invalid" };
  return sql.begin(async (tx) => {
    const e = await lockEvent(tx, i.userId, i.eventId);
    if (!e) return { ok: false, reason: "not_found" } as const;
    if (!open(e, i.now)) return { ok: false, reason: "closed" } as const;
    if (e.hostId === i.userId && response === "declined") return { ok: false, reason: "host" } as const;
    const [prev] = await tx`select response from ride_event_rsvp where event_id = ${e.id} and user_id = ${i.userId}`;
    const final: EventResponse = response === "going" ? seatDecision(await goingCount(tx, e.id, i.userId), e.capacity) : response;
    await tx`
      insert into ride_event_rsvp (event_id, user_id, response, reason, note) values (${e.id}, ${i.userId}, ${final}, ${reason as string | null}, ${note})
      on conflict (event_id, user_id) do update set response = ${final}, reason = ${reason as string | null}, note = ${note}, updated_at = now(),
        checked_in_at = case when ${final} in ('going', 'maybe') then ride_event_rsvp.checked_in_at else null end`;
    if (prev?.response === "going" && final !== "going") await promote(tx, e);
    return { ok: true, response: final } as const;
  });
}

// ---- arriving ----------------------------------------------------------------------------------------------

export async function checkIn(
  sql: Sql,
  i: { userId: string; eventId: string; lat: unknown; lng: unknown; accuracyM: unknown; now: Date },
): Promise<{ ok: true; rideLive: boolean } | Fail<"not_member" | "not_found" | "invalid" | "closed" | "waitlisted" | "full" | Exclude<CheckInVerdict & { ok: false }, { ok: true }>["reason"]>> {
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  if (!finite(i.lat) || !finite(i.lng) || !finite(i.accuracyM) || Math.abs(i.lat) > 90 || Math.abs(i.lng) > 180 || i.accuracyM < 0) return { ok: false, reason: "invalid" };
  const at = { lat: i.lat, lng: i.lng, accuracyM: i.accuracyM };
  return sql.begin(async (tx) => {
    const e = await lockEvent(tx, i.userId, i.eventId);
    if (!e) return { ok: false, reason: "not_found" } as const;
    if (!open(e, i.now)) return { ok: false, reason: "closed" } as const;
    const verdict = checkInVerdict({ lat: e.lat, lng: e.lng, radiusM: e.radiusM, startsAt: e.startsAt }, at, i.now);
    if (!verdict.ok) return verdict;
    const [mine] = await tx`select response from ride_event_rsvp where event_id = ${e.id} and user_id = ${i.userId}`;
    if (mine?.response === "waitlisted") return { ok: false, reason: "waitlisted" } as const;
    if (mine?.response !== "going") {
      // A maybe, a decline or a walk-up becomes a going rider if a seat is free.
      if (seatDecision(await goingCount(tx, e.id, i.userId), e.capacity) === "waitlisted") return { ok: false, reason: "full" } as const;
      await tx`
        insert into ride_event_rsvp (event_id, user_id, response, checked_in_at) values (${e.id}, ${i.userId}, 'going', ${i.now})
        on conflict (event_id, user_id) do update set response = 'going', reason = null, note = null, checked_in_at = ${i.now}, updated_at = now()`;
    } else {
      await tx`update ride_event_rsvp set checked_in_at = coalesce(checked_in_at, ${i.now}), updated_at = now() where event_id = ${e.id} and user_id = ${i.userId}`;
    }
    return { ok: true, rideLive: e.status === "live" } as const;
  });
}

async function riderId(tx: Db, handle: unknown): Promise<string | null> {
  if (typeof handle !== "string" || !UUID.test(handle)) return null;
  const [u] = await tx`select id from app_user where public_id = ${handle} and status = 'active'`;
  return u ? (u.id as string) : null;
}

/** The host marks a rider who is there but whose phone could not check in. */
export async function markArrived(sql: Sql, i: { hostId: string; eventId: string; riderHandle: string; now: Date }): Promise<{ ok: true } | Fail<"not_found" | "not_host" | "closed">> {
  return sql.begin(async (tx) => {
    const e = await lockEvent(tx, i.hostId, i.eventId);
    if (!e) return { ok: false, reason: "not_found" } as const;
    if (e.hostId !== i.hostId) return { ok: false, reason: "not_host" } as const;
    if (!open(e, i.now)) return { ok: false, reason: "closed" } as const;
    const rider = await riderId(tx, i.riderHandle);
    const rows = rider ? await tx`update ride_event_rsvp set checked_in_at = coalesce(checked_in_at, ${i.now}), updated_at = now() where event_id = ${e.id} and user_id = ${rider} and response in ('going', 'maybe') returning user_id` : [];
    return rows.length ? ({ ok: true } as const) : ({ ok: false, reason: "not_found" } as const);
  });
}

// ---- roles -------------------------------------------------------------------------------------------------

/** The host gives a going rider a job, or takes it away with null. While the ride is live the change reaches the map. */
export async function setRole(sql: Sql, i: { hostId: string; eventId: string; riderHandle: string; role: unknown; now: Date }): Promise<{ ok: true } | Fail<"not_found" | "not_host" | "invalid" | "closed">> {
  const role = i.role === null ? null : ROLES.includes(i.role as EventRole) ? (i.role as EventRole) : undefined;
  if (role === undefined) return { ok: false, reason: "invalid" };
  return sql.begin(async (tx) => {
    const e = await lockEvent(tx, i.hostId, i.eventId);
    if (!e) return { ok: false, reason: "not_found" } as const;
    if (e.hostId !== i.hostId) return { ok: false, reason: "not_host" } as const;
    if (!open(e, i.now)) return { ok: false, reason: "closed" } as const;
    const rider = await riderId(tx, i.riderHandle);
    const rows = rider ? await tx`update ride_event_rsvp set role = ${role}, updated_at = now() where event_id = ${e.id} and user_id = ${rider} and response = 'going' returning user_id` : [];
    if (!rows.length) return { ok: false, reason: "not_found" } as const;
    if (e.groupRideId) await tx`update group_ride_member set event_role = ${role} where ride_id = ${e.groupRideId} and user_id = ${rider}`;
    return { ok: true } as const;
  });
}

// ---- starting and joining the ride -----------------------------------------------------------------------------------

/** From an hour before the start the host turns the event into a group ride. Checked-in riders then join it. */
export async function startEvent(sql: Sql, i: { hostId: string; eventId: string; stretchKm?: unknown; now: Date }): Promise<{ ok: true } | Fail<"not_member" | "not_found" | "not_host" | "invalid" | "early" | "closed" | "rate_limited">> {
  const stretch = i.stretchKm === undefined ? 3 : i.stretchKm;
  if (!Number.isInteger(stretch) || (stretch as number) < 1 || (stretch as number) > 10) return { ok: false, reason: "invalid" };
  const [e] = UUID.test(i.eventId)
    ? await sql`select e.id, e.host_id, e.title, e.status, e.starts_at, c.public_id as club_public_id from ride_event e left join club c on c.id = e.club_id where e.public_id = ${i.eventId}`
    : [];
  if (!e || e.host_id !== i.hostId) return { ok: false, reason: e ? "not_host" : "not_found" };
  if (e.status !== "scheduled" || i.now.getTime() - (e.starts_at as Date).getTime() > 6 * HOUR) return { ok: false, reason: "closed" };
  if ((e.starts_at as Date).getTime() - i.now.getTime() > HOUR) return { ok: false, reason: "early" };
  const ride = await createGroupRide(sql, { userId: i.hostId, name: String(e.title).slice(0, 60), clubId: e.club_public_id ?? null, now: i.now });
  if (!ride.ok) return ride.reason === "not_member" || ride.reason === "rate_limited" ? { ok: false, reason: ride.reason } : { ok: false, reason: "not_found" };
  await sql.begin(async (tx) => {
    await tx`update group_ride set event_id = ${e.id}, stretch_km = ${stretch as number} where id = ${ride.id}`;
    await tx`update ride_event set status = 'live', group_ride_id = ${ride.id} where id = ${e.id}`;
    await tx`update group_ride_member set event_role = (select role from ride_event_rsvp where event_id = ${e.id} and user_id = ${i.hostId}) where ride_id = ${ride.id} and user_id = ${i.hostId}`;
    await tx`update ride_event_rsvp set checked_in_at = coalesce(checked_in_at, ${i.now}) where event_id = ${e.id} and user_id = ${i.hostId}`;
  });
  return { ok: true };
}

/** A checked-in rider (or the host) joins the live ride; the host's job for them rides along. */
export async function joinEventRide(sql: Sql, i: { userId: string; eventId: string; displayName: string; now: Date }): Promise<{ ok: true; rideId: string; name: string; code: string; role: "leader" | "member" } | Fail<"not_member" | "not_found" | "not_checked_in" | "not_live" | "full">> {
  if (!UUID.test(i.eventId)) return { ok: false, reason: "not_found" };
  const [e] = await sql`
    select e.id, g.id as ride_id, g.code, g.ended_at, e.status from ride_event e left join group_ride g on g.id = e.group_ride_id
    where e.public_id = ${i.eventId} and ${visibleTo(sql, i.userId)}`;
  if (!e) return { ok: false, reason: "not_found" };
  if (e.status !== "live" || !e.ride_id || e.ended_at) return { ok: false, reason: "not_live" };
  const [mine] = await sql`select checked_in_at, role from ride_event_rsvp where event_id = ${e.id} and user_id = ${i.userId}`;
  if (!mine || mine.checked_in_at === null) return { ok: false, reason: "not_checked_in" };
  const r = await joinGroupRide(sql, { userId: i.userId, code: e.code, displayName: i.displayName, now: i.now });
  if (!r.ok) return r.reason === "not_member" || r.reason === "full" ? { ok: false, reason: r.reason } : { ok: false, reason: "not_found" };
  await sql`update group_ride_member set event_role = ${mine.role} where ride_id = ${e.ride_id} and user_id = ${i.userId}`;
  return { ok: true, rideId: r.id, name: r.name, code: e.code as string, role: r.role };
}

export async function cancelEvent(sql: Sql, i: { hostId: string; eventId: string }): Promise<{ ok: true } | Fail<"not_found" | "not_host" | "closed">> {
  if (!UUID.test(i.eventId)) return { ok: false, reason: "not_found" };
  const [e] = await sql`select host_id, status from ride_event where public_id = ${i.eventId}`;
  if (!e) return { ok: false, reason: "not_found" };
  if (e.host_id !== i.hostId) return { ok: false, reason: "not_host" };
  if (e.status !== "scheduled") return { ok: false, reason: "closed" };
  await sql`update ride_event set status = 'cancelled' where public_id = ${i.eventId}`;
  return { ok: true };
}

// ---- the public page ---------------------------------------------------------------------------------------

export type PublicEvent = { title: string; startsAt: Date; timeZone: string; placeName: string; clubName: string | null; going: number; status: EventStatus };

/** What anyone with the link may see: an open event's name, time, place and how many are going. Members-only and unknown events are null. */
export async function getPublicEvent(sql: Sql, eventId: string, now: Date): Promise<PublicEvent | null> {
  if (!UUID.test(eventId)) return null;
  const [r] = await sql`
    select e.title, e.starts_at, e.time_zone, e.place_name, e.status, g.ended_at as ride_ended_at, c.name as club_name,
      (select count(*)::int from ride_event_rsvp x where x.event_id = e.id and x.response = 'going') as going
    from ride_event e left join club c on c.id = e.club_id left join group_ride g on g.id = e.group_ride_id
    where e.public_id = ${eventId} and e.audience = 'open'`;
  return r ? { title: r.title, startsAt: r.starts_at, timeZone: r.time_zone, placeName: r.place_name, clubName: r.club_name ?? null, going: r.going, status: statusOf(r, now) } : null;
}
