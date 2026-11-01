import { cancelEvent, checkIn, createEvent, getEvent, joinEventRide, listEvents, markArrived, parseEventInput, respond, setRole, startEvent, type EventScope } from "../community/events";
import { ApiError, fail, ok, type Ctx, type RouteDef } from "./http";

const asObject = async (c: Ctx): Promise<Record<string, unknown>> => {
  const b = await c.body();
  if (typeof b !== "object" || b === null || Array.isArray(b)) throw new ApiError(400, "invalid_request", "The body must be a JSON object.");
  return b as Record<string, unknown>;
};
const noContent = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

type Reasons = Record<string, readonly [number, string]>;
const failWith = (map: Reasons, reason: string) => {
  const [status, message] = map[reason] ?? [400, "That can't be done."];
  return fail(status, reason, message);
};

const EVENT: Reasons = {
  not_member: [403, "Finish the welcome step on moto-trails.com first."],
  not_found: [404, "That event isn't available."],
  not_admin: [403, "Only a club admin can host an event for the club."],
  not_host: [403, "Only the host can do that."],
  invalid: [422, "Check the details: a title, a place, a start time in the future, and no web addresses."],
  rate_limited: [429, "You can host five events a day."],
  closed: [409, "This event is over or cancelled."],
  host: [409, "The host can't decline their own event. Cancel it instead."],
  early: [409, "You can start the ride from an hour before it begins."],
  waitlisted: [409, "You're on the waitlist. A seat has to open first."],
  full: [409, "This event is full."],
  far: [409, "You're not at the meeting point yet."],
  inaccurate: [409, "Your location isn't precise enough. Move to open sky and try again."],
  not_checked_in: [409, "Check in at the meeting point first."],
  not_live: [409, "The ride hasn't started."],
};

const SCOPES: readonly EventScope[] = ["discover", "club", "mine"];

export const eventRoutes: RouteDef[] = [
  {
    method: "GET", path: "/events", access: "token", summary: "Upcoming and live events (query: scope discover|club|mine, clubId for club, limit)",
    async handler(c) {
      const scope = (c.url.searchParams.get("scope") ?? "discover") as EventScope;
      if (!SCOPES.includes(scope)) return fail(422, "invalid", "Use scope discover, club or mine.");
      const limit = Number(c.url.searchParams.get("limit") ?? 30);
      const r = await listEvents(c.sql, { userId: c.userId, scope, clubId: c.url.searchParams.get("clubId") ?? undefined, limit: Number.isFinite(limit) ? limit : 30, now: c.now });
      return r.ok ? ok({ items: r.items }) : failWith(EVENT, r.reason);
    },
  },
  {
    method: "POST", path: "/events", access: "write:submission", summary: "Host an event (body: title, description, startsAt ISO, placeName, lat, lng, radiusM 100-500, audience open|members, capacity 2-200, clubId)",
    async handler(c) {
      const parsed = parseEventInput(await asObject(c), c.now);
      if (!parsed.ok) return failWith(EVENT, "invalid");
      const r = await createEvent(c.sql, { userId: c.userId, input: parsed.v, now: c.now });
      return r.ok ? ok({ id: r.id }, 201) : failWith(EVENT, r.reason);
    },
  },
  {
    method: "GET", path: "/events/{id}", access: "token", summary: "One event. The host also gets the roster with reasons and notes",
    async handler(c) {
      const r = await getEvent(c.sql, { userId: c.userId, eventId: c.params.id!, now: c.now });
      return r.ok ? ok(r.event) : failWith(EVENT, r.reason);
    },
  },
  {
    method: "PUT", path: "/events/{id}/response", access: "write:submission", summary: "Reply to an event (body: response going|maybe|declined, reason work|bike|distance|other, note). A full event waitlists a going reply",
    async handler(c) {
      const b = await asObject(c);
      const r = await respond(c.sql, { userId: c.userId, eventId: c.params.id!, response: b.response, reason: b.reason, note: b.note, now: c.now });
      return r.ok ? ok({ response: r.response }) : failWith(EVENT, r.reason);
    },
  },
  {
    method: "POST", path: "/events/{id}/check-in", access: "write:submission", summary: "Check in at the meeting point (body: lat, lng, accuracyM). Allowed from an hour before the start to six hours after",
    async handler(c) {
      const b = await asObject(c);
      const r = await checkIn(c.sql, { userId: c.userId, eventId: c.params.id!, lat: b.lat, lng: b.lng, accuracyM: b.accuracyM, now: c.now });
      return r.ok ? ok({ rideLive: r.rideLive }) : failWith(EVENT, r.reason);
    },
  },
  {
    method: "POST", path: "/events/{id}/arrived/{riderId}", access: "write:submission", summary: "Host marks a rider as arrived",
    async handler(c) {
      const r = await markArrived(c.sql, { hostId: c.userId, eventId: c.params.id!, riderHandle: c.params.riderId!, now: c.now });
      return r.ok ? noContent() : failWith(EVENT, r.reason);
    },
  },
  {
    method: "PUT", path: "/events/{id}/roles/{riderId}", access: "write:submission", summary: "Host gives a going rider a role (body: role captain|marshal|medic|sweep, or null to clear)",
    async handler(c) {
      const b = await asObject(c);
      const r = await setRole(c.sql, { hostId: c.userId, eventId: c.params.id!, riderHandle: c.params.riderId!, role: b.role, now: c.now });
      return r.ok ? noContent() : failWith(EVENT, r.reason);
    },
  },
  {
    method: "POST", path: "/events/{id}/start", access: "write:submission", summary: "Host starts the ride from an hour before the start (body: stretchKm 1-10, default 3). The event becomes a group ride",
    async handler(c) {
      const b = await asObject(c);
      const r = await startEvent(c.sql, { hostId: c.userId, eventId: c.params.id!, stretchKm: b.stretchKm, now: c.now });
      return r.ok ? noContent() : failWith(EVENT, r.reason);
    },
  },
  {
    method: "POST", path: "/events/{id}/join-ride", access: "write:submission", summary: "A checked-in rider joins the live group ride. Returns the group ride id, name, code and your role",
    async handler(c) {
      const [u] = await c.sql`select display_name from app_user where id = ${c.userId}`;
      const r = await joinEventRide(c.sql, { userId: c.userId, eventId: c.params.id!, displayName: String(u?.display_name ?? ""), now: c.now });
      return r.ok ? ok({ id: r.rideId, name: r.name, code: r.code, role: r.role }) : failWith(EVENT, r.reason);
    },
  },
  {
    method: "POST", path: "/events/{id}/cancel", access: "write:submission", summary: "Host cancels an event that has not started",
    async handler(c) {
      const r = await cancelEvent(c.sql, { hostId: c.userId, eventId: c.params.id! });
      return r.ok ? noContent() : failWith(EVENT, r.reason);
    },
  },
];
