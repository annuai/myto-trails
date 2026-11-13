import { SYNC_KINDS, SYNC_LIMITS, isSyncId, isSyncKind, type SyncKind } from "@moto-trails/domain";
import { eraseSyncData, getTrack, getUsage, pullChanges, pushChanges, putTrack, type SyncChange } from "../sync/sync";
import { ApiError, fail, ok, readBytesCapped, type Ctx, type RouteDef } from "./http";

const bad = (m: string) => new ApiError(400, "invalid_request", m);
const DEVICE = /^[A-Za-z0-9._-]{8,64}$/;
const DAY_MS = 86_400_000;

const deviceOf = (v: unknown): string => {
  if (typeof v !== "string" || !DEVICE.test(v)) throw bad("deviceId is 8 to 64 letters, digits, dot, dash or underscore.");
  return v;
};
function dateOf(v: unknown, field: string, now: Date, opts: { allowOld?: boolean } = {}): Date {
  const t = typeof v === "string" ? Date.parse(v) : NaN;
  if (Number.isNaN(t)) throw bad(`${field} is an ISO date and time.`);
  // A phone with a wrong clock must not be able to win every conflict from the future, nor write the distant past.
  if (t > now.getTime() + DAY_MS) throw bad(`${field} cannot be more than a day in the future.`);
  if (!opts.allowOld && t < Date.UTC(2015, 0, 1)) throw bad(`${field} is too old.`);
  return new Date(t);
}

function parseChange(raw: unknown, now: Date): SyncChange {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw bad("Each change is an object.");
  const r = raw as Record<string, unknown>;
  for (const k of Object.keys(r)) if (!["kind", "id", "data", "updatedAt", "baseUpdatedAt", "deleted"].includes(k)) throw bad(`"${k}" is not a sync field.`);
  if (!isSyncKind(r.kind)) throw bad(`kind is one of ${SYNC_KINDS.join(", ")}.`);
  if (!isSyncId(r.id)) throw bad("id is 1 to 80 letters, digits, dot, dash, underscore or tilde.");
  const deleted = r.deleted === true;
  const data = r.data ?? {};
  if (typeof data !== "object" || data === null || Array.isArray(data)) throw bad("data is an object.");
  if (!deleted && JSON.stringify(data).length > SYNC_LIMITS.maxRecordBytes) throw bad(`data is at most ${SYNC_LIMITS.maxRecordBytes} bytes; a ride's points go in a track, not in data.`);
  const updatedAt = dateOf(r.updatedAt, "updatedAt", now);
  const baseUpdatedAt = r.baseUpdatedAt === null || r.baseUpdatedAt === undefined ? null : dateOf(r.baseUpdatedAt, "baseUpdatedAt", now);
  return { kind: r.kind as SyncKind, id: r.id, data: data as Record<string, unknown>, updatedAt, baseUpdatedAt, deleted };
}

const rideIdOf = (c: Ctx) => {
  const id = c.params.id!;
  if (!isSyncId(id)) throw new ApiError(404, "not_found", "No such ride.");
  return id;
};

export const syncRoutes: RouteDef[] = [
  {
    method: "POST", path: "/sync/push", access: "sync",
    summary: "Send the changes made on this phone (body: deviceId and changes, up to 200 of kind, id, data, updatedAt, baseUpdatedAt and deleted). Returns accepted, conflicts (a ride edited on two phones is kept twice), stale (the server has newer) and overQuota",
    async handler(c) {
      const b = await c.body();
      if (typeof b !== "object" || b === null || Array.isArray(b)) throw bad("Send { deviceId, changes: [...] }.");
      const body = b as Record<string, unknown>;
      const deviceId = deviceOf(body.deviceId);
      if (!Array.isArray(body.changes) || body.changes.length > SYNC_LIMITS.maxChanges) throw bad(`changes is a list of at most ${SYNC_LIMITS.maxChanges}.`);
      const changes = body.changes.map((x) => parseChange(x, c.now));
      return ok(await pushChanges(c.sql, c.storage, { userId: c.userId, deviceId, changes }));
    },
  },
  {
    method: "GET", path: "/sync/pull", access: "sync",
    summary: "Changes from your other phones (?deviceId=, ?since=cursor from the last pull, ?kinds=ride,trip, ?limit up to 200). Returns changes, a cursor to send next time, and more when another page is waiting",
    async handler(c) {
      const q = c.url.searchParams;
      const deviceId = deviceOf(q.get("deviceId"));
      const sinceRaw = q.get("since");
      // An idle phone is handed the epoch as its cursor, so an old `since` is normal; only edit times are limited.
      const since = sinceRaw ? dateOf(sinceRaw, "since", c.now, { allowOld: true }) : null;
      const kindsRaw = q.get("kinds");
      const kinds = kindsRaw ? kindsRaw.split(",") : [...SYNC_KINDS];
      if (!kinds.every(isSyncKind)) throw bad(`kinds are from ${SYNC_KINDS.join(", ")}.`);
      const limit = Math.min(Math.max(Number(q.get("limit") ?? 100) || 100, 1), SYNC_LIMITS.maxChanges);
      return ok(await pullChanges(c.sql, { userId: c.userId, deviceId, since, kinds: kinds as SyncKind[], limit }));
    },
  },
  {
    method: "PUT", path: "/sync/rides/{id}/track", access: "sync",
    summary: "Store a ride's compressed points (raw bytes, up to 400 KB). Push the ride first: 404 until it exists. 413 when too large, 409 over_quota past 50 MB in all",
    async handler(c) {
      const bytes = await readBytesCapped(c.req, SYNC_LIMITS.maxTrackBytes);
      const r = await putTrack(c.sql, c.storage, { userId: c.userId, rideId: rideIdOf(c), bytes });
      if (r.ok) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
      if (r.reason === "no_such_ride") return fail(404, "not_found", "Push the ride before its track.");
      if (r.reason === "too_large") return fail(413, "body_too_large", "A track is between 1 byte and 400 KB.");
      return fail(409, "over_quota", "Your synced tracks are over 50 MB. Delete rides you no longer need.");
    },
  },
  {
    method: "GET", path: "/sync/rides/{id}/track", access: "sync",
    summary: "A synced ride's compressed points",
    async handler(c) {
      const bytes = await getTrack(c.sql, c.storage, { userId: c.userId, rideId: rideIdOf(c) });
      return bytes ? new Response(bytes as BodyInit, { headers: { "Content-Type": "application/octet-stream", "Cache-Control": "no-store" } }) : fail(404, "not_found", "No track for that ride.");
    },
  },
  {
    method: "GET", path: "/sync/usage", access: "sync",
    summary: "How much of the sync allowance is used: rides and track bytes, against the limits",
    async handler(c) { return ok(await getUsage(c.sql, c.userId)); },
  },
  {
    method: "DELETE", path: "/sync", access: "sync",
    summary: "Delete your cloud copy: every synced record and track. Your phones keep their own data",
    async handler(c) {
      await eraseSyncData(c.sql, c.storage, c.userId);
      return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    },
  },
];
