import type { Sql } from "postgres";
import { DEFAULT_TIME_ZONE, validTimeZone, zoneName } from "@/lib/time-zone";
import type { EmailSender } from "../auth/email";
import { generateToken, hashToken } from "../auth/tokens";
import { cleanBody, LINK } from "../community/comments";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** A check-in can look at most this far ahead, from now or from when it started. */
export const MAX_AHEAD_MS = 7 * DAY;
/** Position and emergency details are wiped this long after a check-in ends (arrival, or the expected time passing). */
export const WIPE_AFTER_MS = DAY;
const PING_GAP_SECONDS = 20;
const CREATES_PER_DAY = 10;
const MAX_OPEN = 3;

export type CheckinStatus = "active" | "overdue" | "arrived" | "expired";
export type Emergency = { riderName?: string; bloodGroup?: string; allergies?: string; bikeName?: string };
export type Position = { lat: number; lng: number; at: Date };

/** Computed from the times alone, so it is right whenever it is read, even if no scheduled job has run. */
export function checkinStatus(c: { expectedAt: Date; arrivedAt: Date | null }, now: Date): CheckinStatus {
  const end = c.arrivedAt ?? c.expectedAt;
  if (now.getTime() - end.getTime() > WIPE_AFTER_MS) return "expired";
  if (c.arrivedAt) return "arrived";
  return now.getTime() > c.expectedAt.getTime() ? "overdue" : "active";
}

const text = (v: unknown, max: number) => {
  const s = cleanBody(v).replace(/\s*\n\s*/g, " ");
  return s.length <= max && !LINK.test(s) ? s : null;
};
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function parsePosition(v: unknown): Position | null {
  if (typeof v !== "object" || v === null) return null;
  const p = v as Record<string, unknown>;
  const at = typeof p.at === "string" ? new Date(p.at) : null;
  if (!finite(p.lat) || !finite(p.lng) || Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180 || !at || Number.isNaN(at.getTime())) return null;
  return { lat: p.lat, lng: p.lng, at };
}

/** The time a rider expects to arrive: an ISO instant in the future, within a week of `from`. */
export function parseExpectedAt(v: unknown, from: Date): Date | null {
  const d = typeof v === "string" ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime()) || d.getTime() <= from.getTime() || d.getTime() > from.getTime() + MAX_AHEAD_MS) return null;
  return d;
}

export type NewCheckin = { timeZone: string; rideName: string | null; expectedAt: Date; contactName: string; contactEmail: string | null; shareLive: boolean; position: Position | null; emergency: Emergency | null };

export function parseNewCheckin(b: Record<string, unknown>, now: Date): NewCheckin | null {
  const expectedAt = parseExpectedAt(b.expectedAt, now);
  const contactName = text(b.contactName, 60);
  const rideName = b.rideName === undefined || b.rideName === "" ? null : text(b.rideName, 60);
  const email = b.contactEmail === undefined || b.contactEmail === "" ? null : String(b.contactEmail).trim().toLowerCase();
  if (!expectedAt || !contactName || (rideName === null && b.rideName !== undefined && b.rideName !== "")) return null;
  if (email !== null && !(email.length <= 254 && /^[^@\s]+@[^@\s]+$/.test(email))) return null;
  const position = b.position === undefined ? null : parsePosition(b.position);
  if (b.position !== undefined && !position) return null;
  let emergency: Emergency | null = null;
  if (b.emergency !== undefined) {
    if (typeof b.emergency !== "object" || b.emergency === null) return null;
    const e = b.emergency as Record<string, unknown>;
    const pick = (k: keyof Emergency, max: number) => (e[k] === undefined || e[k] === "" ? undefined : text(e[k], max));
    const parts = { riderName: pick("riderName", 60), bloodGroup: pick("bloodGroup", 10), allergies: pick("allergies", 200), bikeName: pick("bikeName", 80) };
    if (Object.values(parts).some((v) => v === null)) return null;
    emergency = Object.fromEntries(Object.entries(parts).filter(([, v]) => v !== undefined)) as Emergency;
    if (Object.keys(emergency).length === 0) emergency = null;
  }
  return { timeZone: validTimeZone(b.timeZone) ?? DEFAULT_TIME_ZONE, rideName: rideName || null, expectedAt, contactName, contactEmail: email, shareLive: b.shareLive === true, position, emergency };
}

type Fail<R extends string> = { ok: false; reason: R };

export async function createCheckin(sql: Sql, i: { userId: string; input: NewCheckin; now: Date }): Promise<{ ok: true; id: string; token: string } | Fail<"invalid" | "rate_limited" | "too_many">> {
  if (!UUID.test(i.userId)) return { ok: false, reason: "invalid" };
  return sql.begin(async (tx) => {
    const [hit] = await tx`select rate_limit_hit(${`checkin-create:${i.userId}`}, ${CREATES_PER_DAY}, 86400) as ok`;
    if (!hit!.ok) return { ok: false, reason: "rate_limited" } as const;
    const [open] = await tx`select count(*)::int as n from ride_checkin where user_id = ${i.userId} and arrived_at is null and wiped_at is null and expected_at > ${new Date(i.now.getTime() - WIPE_AFTER_MS)}`;
    if (open!.n >= MAX_OPEN) return { ok: false, reason: "too_many" } as const;
    const token = generateToken();
    const p = i.input.position;
    const [row] = await tx`
      insert into ride_checkin (user_id, token_hash, ride_name, contact_name, contact_email, share_live, started_at, expected_at, time_zone, last_lat, last_lng, last_ping_at, emergency)
      values (${i.userId}, ${hashToken(token)}, ${i.input.rideName}, ${i.input.contactName}, ${i.input.contactEmail}, ${i.input.shareLive}, ${i.now}, ${i.input.expectedAt}, ${i.input.timeZone},
        ${p?.lat ?? null}, ${p?.lng ?? null}, ${p ? i.now : null}, ${i.input.emergency ? tx.json(i.input.emergency) : null})
      returning id`;
    return { ok: true, id: row!.id as string, token } as const;
  });
}

type Mine = { id: string; expectedAt: Date; arrivedAt: Date | null; startedAt: Date; wipedAt: Date | null };
async function mine(sql: Sql, userId: string, id: string): Promise<Mine | null> {
  if (!UUID.test(id)) return null;
  const [r] = await sql`select id, expected_at, arrived_at, started_at, wiped_at from ride_checkin where id = ${id} and user_id = ${userId}`;
  return r ? { id: r.id, expectedAt: r.expected_at, arrivedAt: r.arrived_at, startedAt: r.started_at, wipedAt: r.wiped_at } : null;
}

/** The rider's own view of a check-in. */
export async function getMyCheckin(sql: Sql, i: { userId: string; id: string; now: Date }) {
  const [r] = UUID.test(i.id) ? await sql`select id, expected_at, arrived_at, last_ping_at from ride_checkin where id = ${i.id} and user_id = ${i.userId}` : [];
  if (!r) return null;
  const arrivedAt = r.arrived_at as Date | null;
  return {
    id: r.id as string, status: checkinStatus({ expectedAt: r.expected_at, arrivedAt }, i.now),
    expectedAt: (r.expected_at as Date).toISOString(), arrivedAt: arrivedAt ? arrivedAt.toISOString() : null, lastPingAt: r.last_ping_at ? (r.last_ping_at as Date).toISOString() : null,
  };
}

/** Records where the rider is. Accepted at most once every 20 seconds; a faster ping is answered as fine and ignored. */
export async function pingCheckin(sql: Sql, i: { userId: string; id: string; position: Position; batteryPct: number | null; now: Date }): Promise<{ ok: true } | Fail<"not_found" | "ended">> {
  const c = await mine(sql, i.userId, i.id);
  if (!c) return { ok: false, reason: "not_found" };
  if (c.arrivedAt || c.wipedAt || checkinStatus(c, i.now) === "expired") return { ok: false, reason: "ended" };
  await sql`
    update ride_checkin set last_lat = ${i.position.lat}, last_lng = ${i.position.lng}, last_ping_at = ${i.now}, battery_pct = ${i.batteryPct}
    where id = ${c.id} and (last_ping_at is null or last_ping_at <= ${new Date(i.now.getTime() - PING_GAP_SECONDS * 1000)})`;
  return { ok: true };
}

export async function extendCheckin(sql: Sql, i: { userId: string; id: string; expectedAt: Date; now: Date }): Promise<{ ok: true } | Fail<"not_found" | "ended" | "invalid">> {
  const c = await mine(sql, i.userId, i.id);
  if (!c) return { ok: false, reason: "not_found" };
  if (c.arrivedAt || c.wipedAt || checkinStatus(c, i.now) === "expired") return { ok: false, reason: "ended" };
  if (i.expectedAt.getTime() <= i.now.getTime() || i.expectedAt.getTime() > c.startedAt.getTime() + MAX_AHEAD_MS) return { ok: false, reason: "invalid" };
  // Running late again means the contact has not been told yet: the email can go out for the new time.
  await sql`update ride_checkin set expected_at = ${i.expectedAt}, overdue_notified_at = null where id = ${c.id}`;
  return { ok: true };
}

/** Marks the rider safe and wipes their position. Asking twice is fine. */
export async function arriveCheckin(sql: Sql, i: { userId: string; id: string; now: Date }): Promise<{ ok: true } | Fail<"not_found">> {
  const c = await mine(sql, i.userId, i.id);
  if (!c) return { ok: false, reason: "not_found" };
  await sql`
    update ride_checkin set arrived_at = coalesce(arrived_at, ${i.now}), last_lat = null, last_lng = null, last_ping_at = null, battery_pct = null
    where id = ${c.id}`;
  return { ok: true };
}

export type TrackView =
  | { found: false }
  | {
      found: true; status: CheckinStatus; timeZone: string; riderName: string; rideName: string | null; expectedAt: string; arrivedAt: string | null;
      lastSeenAt: string | null; position: { lat: number; lng: number } | null; batteryPct: number | null; emergency: Emergency | null;
    };

/**
 * What the contact sees at /track/<token>. The position is shown only when the check-in is overdue, or when the rider
 * chose to share it live. The emergency card is shown only when overdue. An ended check-in shows neither.
 */
export async function viewCheckin(sql: Sql, token: string, now: Date): Promise<TrackView> {
  if (!TOKEN.test(token)) return { found: false };
  const [r] = await sql`
    select c.ride_name, c.share_live, c.time_zone, c.expected_at, c.arrived_at, c.last_lat, c.last_lng, c.last_ping_at, c.battery_pct, c.emergency, c.wiped_at, u.display_name
    from ride_checkin c join app_user u on u.id = c.user_id
    where c.token_hash = ${hashToken(token)}`;
  if (!r) return { found: false };
  const expectedAt = r.expected_at as Date;
  const arrivedAt = r.arrived_at as Date | null;
  const status = checkinStatus({ expectedAt, arrivedAt }, now);
  const ended = status === "expired" || r.wiped_at !== null;
  const showPosition = !ended && r.last_lat !== null && (status === "overdue" || (status === "active" && r.share_live === true));
  const emergency = (r.emergency ?? null) as Emergency | null;
  return {
    found: true, status: ended ? "expired" : status, timeZone: r.time_zone as string, riderName: String(emergency?.riderName ?? r.display_name), rideName: r.ride_name, expectedAt: expectedAt.toISOString(), arrivedAt: arrivedAt ? arrivedAt.toISOString() : null,
    lastSeenAt: !ended && r.last_ping_at ? (r.last_ping_at as Date).toISOString() : null,
    position: showPosition ? { lat: r.last_lat, lng: r.last_lng } : null,
    batteryPct: showPosition ? r.battery_pct : null,
    emergency: !ended && status === "overdue" ? emergency : null,
  };
}

export function overdueEmail(i: { riderName: string; rideName: string | null; expectedAt: Date; timeZone?: string }): { subject: string; text: string } {
  const zone = i.timeZone ?? DEFAULT_TIME_ZONE;
  const when = i.expectedAt.toLocaleString("en-GB", { timeZone: zone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  const rider = i.riderName.replace(/[\r\n]+/g, " ").slice(0, 60);
  return {
    subject: `${rider} has not arrived`,
    text: [
      `${rider} asked Myto to tell you if they had not arrived${i.rideName ? ` from "${i.rideName.replace(/[\r\n]+/g, " ")}"` : ""} by ${when} (${zoneName(zone, i.expectedAt)}), and they have not marked themselves safe.`,
      "",
      "Open the link they shared with you for their last known position and emergency details.",
      "Try calling them first. If you cannot reach them and are worried, call 112.",
      "",
      "You are getting this because they named you as their contact. Nothing else will be sent.",
    ].join("\n"),
  };
}

/**
 * Scheduled sweep. Emails each contact once when a check-in turns overdue, then wipes positions, emergency details and
 * the contact's address 24 hours after a check-in ends. A failing email is logged, tried again on the next sweep, and never stops it.
 */
export async function sweepCheckins(sql: Sql, sender: EmailSender, now: Date): Promise<{ notified: number; wiped: number }> {
  const due = await sql`
    select c.id, c.contact_email, c.ride_name, c.expected_at, c.time_zone, u.display_name, c.emergency
    from ride_checkin c join app_user u on u.id = c.user_id
    where c.arrived_at is null and c.wiped_at is null and c.overdue_notified_at is null and c.expected_at <= ${now} and c.contact_email is not null
      and c.expected_at > ${new Date(now.getTime() - WIPE_AFTER_MS)}`;
  let notified = 0;
  for (const d of due) {
    try {
      const rider = (d.emergency as Emergency | null)?.riderName ?? (d.display_name as string);
      await sender.send({ to: d.contact_email as string, ...overdueEmail({ riderName: rider, rideName: d.ride_name, expectedAt: d.expected_at, timeZone: d.time_zone }) });
      // Marked only after it went out, so an email that failed is tried again on the next sweep.
      await sql`update ride_checkin set overdue_notified_at = ${now} where id = ${d.id} and overdue_notified_at is null`;
      notified++;
    } catch (e) {
      console.error("Check-in email failed", e instanceof Error ? e.message : "unknown");
    }
  }
  const wiped = await sql`
    update ride_checkin set last_lat = null, last_lng = null, last_ping_at = null, battery_pct = null, emergency = null, contact_email = null, wiped_at = ${now}
    where wiped_at is null and coalesce(arrived_at, expected_at) <= ${new Date(now.getTime() - WIPE_AFTER_MS)}
    returning id`;
  return { notified, wiped: wiped.length };
}
