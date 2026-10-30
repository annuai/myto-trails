import { isValidSlug } from "@moto-trails/domain";
import { arriveCheckin, extendCheckin, getMyCheckin, createCheckin, parseExpectedAt, parseNewCheckin, parsePosition, pingCheckin } from "../rides/checkins";
import { confirmConditionReport, createConditionReport, listConditionReports } from "../rides/condition-reports";
import { activeClubGroupRide, createGroupRide, endGroupRide, joinGroupRide, leaveGroupRide, setRegroup, syncGroupRide } from "../rides/group-rides";
import { createSharedRoute, deleteSharedRoute, getSharedRoute, parseSharedRoute } from "../rides/shared-routes";
import { ApiError, fail, ok, type Ctx, type RouteDef } from "./http";

const asObject = async (c: Ctx): Promise<Record<string, unknown>> => {
  const b = await c.body();
  if (typeof b !== "object" || b === null || Array.isArray(b)) throw new ApiError(400, "invalid_request", "The body must be a JSON object.");
  return b as Record<string, unknown>;
};
const noContent = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
const str = (v: unknown) => (typeof v === "string" ? v : "");

type Reasons = Record<string, readonly [number, string]>;
const failWith = (map: Reasons, reason: string) => {
  const [status, message] = map[reason] ?? [400, "That can't be done."];
  return fail(status, reason, message);
};

const NOT_MEMBER = [403, "Finish the welcome step on moto-trails.com first."] as const;
const NOT_FOUND = [404, "That isn't available."] as const;

const CHECKIN: Reasons = {
  not_found: [404, "No such check-in."],
  ended: [409, "That check-in has ended."],
  invalid: [422, "Pick a time in the future, within a week."],
  rate_limited: [429, "You can start ten check-ins a day."],
  too_many: [409, "You already have three check-ins open. Mark one as arrived first."],
};
const GROUP: Reasons = {
  not_member: NOT_MEMBER, not_found: [404, "That group ride isn't available. Check the code."], invalid: [422, "Use 1 to 60 characters, and leave web addresses out."],
  rate_limited: [429, "You can start five group rides a day."], too_many_tries: [429, "Too many tries. Wait a little while, then enter the code again."], full: [409, "This group ride is full (30 riders)."],
  not_leader: [403, "Only the leader can do that."], leader: [409, "The leader ends the ride instead of leaving it."],
};
const REPORT: Reasons = {
  not_member: NOT_MEMBER, not_found: [404, "That isn't available any more."], invalid: [422, "Pick what you saw, with a time that is not in the future or more than 30 days ago."],
  no_links: [422, "Please leave web addresses out."], rate_limited: [429, "You are reporting too fast. Try again in a little while."], own_report: [409, "You can't confirm your own report."],
};
const ROUTE: Reasons = {
  not_member: NOT_MEMBER, rate_limited: [429, "You can share twenty routes a day."], too_many: [409, "You have shared 50 routes. Delete one first."],
};

const trailSlug = (c: Ctx) => {
  const s = c.params.slug!;
  if (!isValidSlug(s)) throw new ApiError(404, "not_found", "No such trail.");
  return s;
};

export const rideRoutes: RouteDef[] = [
  {
    method: "POST", path: "/checkins", access: "write:submission", summary: "Tell someone if you have not arrived (body: expectedAt ISO within 7 days, contactName, contactEmail, rideName, shareLive, position, emergency). Returns the link to send them; shown once",
    async handler(c) {
      const input = parseNewCheckin(await asObject(c), c.now);
      if (!input) return fail(422, "invalid", "Give a contact name and an arrival time in the future, within a week. Leave web addresses out.");
      const r = await createCheckin(c.sql, { userId: c.userId, input, now: c.now });
      return r.ok ? ok({ id: r.id, token: r.token, url: `${c.siteUrl}/track/${r.token}` }, 201) : failWith(CHECKIN, r.reason);
    },
  },
  {
    method: "GET", path: "/checkins/{id}", access: "token", summary: "Your check-in: status active, overdue, arrived or expired",
    async handler(c) {
      const r = await getMyCheckin(c.sql, { userId: c.userId, id: c.params.id!, now: c.now });
      return r ? ok(r) : failWith(CHECKIN, "not_found");
    },
  },
  {
    method: "POST", path: "/checkins/{id}/ping", access: "write:submission", summary: "Where you are (body: lat, lng, at, batteryPct). At most one is kept every 20 seconds",
    async handler(c) {
      const b = await asObject(c);
      const position = parsePosition(b);
      const battery = b.batteryPct === undefined ? null : b.batteryPct;
      if (!position || (battery !== null && !(typeof battery === "number" && Number.isInteger(battery) && battery >= 0 && battery <= 100))) return fail(422, "invalid", "Send lat, lng and an ISO time in at.");
      const r = await pingCheckin(c.sql, { userId: c.userId, id: c.params.id!, position, batteryPct: battery as number | null, now: c.now });
      return r.ok ? noContent() : failWith(CHECKIN, r.reason);
    },
  },
  {
    method: "POST", path: "/checkins/{id}/extend", access: "write:submission", summary: "Running late: move the arrival time later (body: expectedAt)",
    async handler(c) {
      const b = await asObject(c);
      const expectedAt = parseExpectedAt(b.expectedAt, c.now);
      if (!expectedAt) return failWith(CHECKIN, "invalid");
      const r = await extendCheckin(c.sql, { userId: c.userId, id: c.params.id!, expectedAt, now: c.now });
      return r.ok ? noContent() : failWith(CHECKIN, r.reason);
    },
  },
  {
    method: "POST", path: "/checkins/{id}/arrive", access: "write:submission", summary: "Mark yourself safe. Your last position is wiped",
    async handler(c) {
      const r = await arriveCheckin(c.sql, { userId: c.userId, id: c.params.id!, now: c.now });
      return r.ok ? noContent() : failWith(CHECKIN, r.reason);
    },
  },

  {
    method: "POST", path: "/group-rides", access: "write:submission", summary: "Start a group ride; you lead it (body: name, clubId of a club you belong to). Returns the code others join with",
    async handler(c) {
      const b = await asObject(c);
      const r = await createGroupRide(c.sql, { userId: c.userId, name: str(b.name), clubId: str(b.clubId) || null, now: c.now });
      return r.ok ? ok({ id: r.id, code: r.code, name: r.name, expiresAt: r.expiresAt }, 201) : failWith(GROUP, r.reason);
    },
  },
  {
    method: "GET", path: "/clubs/{id}/group-ride", access: "token", cache: "none", summary: "The group ride a club's riders can join now: { ride: { id, name, code } } or { ride: null }. Club members only",
    async handler(c) {
      const r = await activeClubGroupRide(c.sql, { userId: c.userId, clubId: c.params.id!, now: c.now });
      return r.ok ? ok({ ride: r.ride }) : failWith(GROUP, r.reason);
    },
  },
  {
    method: "POST", path: "/group-rides/join", access: "write:submission", summary: "Join a group ride with its code (body: code, displayName). Joining again is fine",
    async handler(c) {
      const b = await asObject(c);
      const r = await joinGroupRide(c.sql, { userId: c.userId, code: str(b.code), displayName: str(b.displayName), now: c.now });
      return r.ok ? ok({ id: r.id, name: r.name, role: r.role }) : failWith(GROUP, r.reason);
    },
  },
  {
    method: "POST", path: "/group-rides/{id}/sync", access: "write:submission", summary: "Send your position and signal (body: lat, lng, at, status ok|wait_up|fuel|break|help) and get everyone's back, with the regroup point. Send {} to only read",
    async handler(c) {
      const b = await asObject(c);
      const r = await syncGroupRide(c.sql, { userId: c.userId, rideId: c.params.id!, lat: b.lat, lng: b.lng, status: b.status, now: c.now });
      return "ok" in r ? failWith(GROUP, r.reason) : ok(r);
    },
  },
  {
    method: "POST", path: "/group-rides/{id}/regroup", access: "write:submission", summary: "The leader sets a regroup point (body: lat, lng, note) or removes it (body: clear true)",
    async handler(c) {
      const b = await asObject(c);
      const r = await setRegroup(c.sql, { userId: c.userId, rideId: c.params.id!, point: b.clear === true ? null : { lat: b.lat, lng: b.lng, note: b.note }, now: c.now });
      return r.ok ? noContent() : failWith(GROUP, r.reason);
    },
  },
  {
    method: "POST", path: "/group-rides/{id}/leave", access: "write:submission", summary: "Leave a group ride. Your position is wiped. The leader ends it instead",
    async handler(c) {
      const r = await leaveGroupRide(c.sql, { userId: c.userId, rideId: c.params.id! });
      return r.ok ? noContent() : failWith(GROUP, r.reason);
    },
  },
  {
    method: "POST", path: "/group-rides/{id}/end", access: "write:submission", summary: "The leader ends the ride for everyone and every position is wiped",
    async handler(c) {
      const r = await endGroupRide(c.sql, { userId: c.userId, rideId: c.params.id!, now: c.now });
      return r.ok ? noContent() : failWith(GROUP, r.reason);
    },
  },

  {
    method: "GET", path: "/trails/{slug}/condition-reports", access: "public", cache: "none", /* confirmations change by the minute */ summary: "What riders reported recently: kind, time, confirmations, disputes and whether it is fresh. Rider reports, not published access",
    async handler(c) {
      const items = await listConditionReports(c.sql, trailSlug(c), c.now);
      return items ? ok({ items }) : failWith(REPORT, "not_found");
    },
  },
  {
    method: "POST", path: "/trails/{slug}/condition-reports", access: "write:submission", summary: "Report what you saw (body: clientId, kind clear|muddy|blocked|washed_out|closed, at ISO, note, lat, lng, mediaId). Sending the same clientId again is harmless. Never changes the trail's published access",
    async handler(c) {
      const b = await asObject(c);
      const r = await createConditionReport(c.sql, { userId: c.userId, slug: trailSlug(c), clientId: b.clientId, kind: b.kind, note: b.note, at: b.at, lat: b.lat, lng: b.lng, mediaId: b.mediaId, now: c.now });
      return r.ok ? ok({ id: r.id }, 201) : failWith(REPORT, r.reason);
    },
  },
  {
    method: "POST", path: "/condition-reports/{id}/confirm", access: "write:submission", summary: "Say whether a report is still true (body: still true|false). One vote each; not on your own report",
    async handler(c) {
      const b = await asObject(c);
      if (typeof b.still !== "boolean") throw new ApiError(400, "invalid_request", "still must be true or false.");
      const r = await confirmConditionReport(c.sql, { userId: c.userId, reportId: c.params.id!, still: b.still });
      return r.ok ? noContent() : failWith(REPORT, r.reason);
    },
  },

  {
    method: "POST", path: "/shared-routes", access: "write:submission", summary: "Share a route as a link (body: name, points [[lat,lng]] 2 to 2000, waypoints, distanceKm, elevationGainM). Trim your start and end first",
    async handler(c) {
      const route = parseSharedRoute(await asObject(c));
      if (!route) return fail(422, "invalid", "Send 2 to 2000 points as [lat, lng], up to 50 waypoints, and the distance in km.");
      const r = await createSharedRoute(c.sql, { userId: c.userId, route });
      return r.ok ? ok({ id: r.id, url: `${c.siteUrl}/route/${r.id}` }, 201) : failWith(ROUTE, r.reason);
    },
  },
  {
    method: "GET", path: "/shared-routes/{id}", access: "public", cache: "none", /* the owner can stop sharing at any time */ summary: "A shared route: name, points, waypoints, distance and climb",
    async handler(c) {
      const r = await getSharedRoute(c.sql, c.params.id!);
      return r ? ok(r) : fail(NOT_FOUND[0], "not_found", "No such route.");
    },
  },
  {
    method: "DELETE", path: "/shared-routes/{id}", access: "write:submission", summary: "Stop sharing a route you shared",
    async handler(c) {
      return (await deleteSharedRoute(c.sql, { userId: c.userId, id: c.params.id! })) ? noContent() : fail(NOT_FOUND[0], "not_found", "No such route.");
    },
  },
];
