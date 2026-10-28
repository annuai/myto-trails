import { randomInt } from "node:crypto";
import type { Sql } from "postgres";
import { cleanBody, LINK } from "../community/comments";
import { isMember } from "../community/members";
import { writeGpx } from "../gpx/write";

const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const ID = /^[a-z2-9]{10}$/;
export const MAX_POINTS = 2000;
export const MAX_WAYPOINTS = 50;
const SHARES_PER_DAY = 20;
const MAX_PER_USER = 50;

export type SharedPoint = [lat: number, lng: number];
export type SharedWaypoint = { name: string; lat: number; lng: number };
export type SharedRoute = { name: string; points: SharedPoint[]; waypoints: SharedWaypoint[]; distanceKm: number; elevationGainM: number | null };

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const r5 = (n: number) => Math.round(n * 1e5) / 1e5;
const strip = (v: unknown, max: number) => cleanBody(v).replace(new RegExp(LINK.source, "gi"), "").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, max);

export function newPublicId(rand: (n: number) => number = randomInt): string {
  return Array.from({ length: 10 }, () => ID_ALPHABET[rand(ID_ALPHABET.length)]).join("");
}
export const isPublicId = (v: string) => ID.test(v);

/** Checks and tidies what the phone sent: coordinates to 5 decimals, names without web addresses. Null when it is not a route. */
export function parseSharedRoute(b: Record<string, unknown>): SharedRoute | null {
  const pts = b.points;
  if (!Array.isArray(pts) || pts.length < 2 || pts.length > MAX_POINTS) return null;
  const points: SharedPoint[] = [];
  for (const p of pts) {
    if (!Array.isArray(p) || p.length < 2 || !finite(p[0]) || !finite(p[1]) || Math.abs(p[0]) > 90 || Math.abs(p[1]) > 180) return null;
    points.push([r5(p[0]), r5(p[1])]);
  }
  const wps = b.waypoints === undefined ? [] : b.waypoints;
  if (!Array.isArray(wps) || wps.length > MAX_WAYPOINTS) return null;
  const waypoints: SharedWaypoint[] = [];
  for (const w of wps) {
    const o = w as Record<string, unknown> | null;
    if (typeof o !== "object" || o === null || !finite(o.lat) || !finite(o.lng) || Math.abs(o.lat) > 90 || Math.abs(o.lng) > 180) return null;
    waypoints.push({ name: strip(o.name, 40) || "Waypoint", lat: r5(o.lat), lng: r5(o.lng) });
  }
  if (!finite(b.distanceKm) || b.distanceKm < 0 || b.distanceKm > 5000) return null;
  const gain = b.elevationGainM === undefined || b.elevationGainM === null ? null : b.elevationGainM;
  if (gain !== null && (!finite(gain) || gain < 0 || gain > 20000)) return null;
  return { name: strip(b.name, 80) || "Shared route", points, waypoints, distanceKm: Math.round(b.distanceKm * 10) / 10, elevationGainM: gain === null ? null : Math.round(gain) };
}

export async function createSharedRoute(sql: Sql, i: { userId: string; route: SharedRoute }): Promise<{ ok: true; id: string } | { ok: false; reason: "not_member" | "rate_limited" | "too_many" }> {
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  return sql.begin(async (tx) => {
    const [hit] = await tx`select rate_limit_hit(${`route-share:${i.userId}`}, ${SHARES_PER_DAY}, 86400) as ok`;
    if (!hit!.ok) return { ok: false, reason: "rate_limited" } as const;
    const [n] = await tx`select count(*)::int as n from shared_route where owner_id = ${i.userId}`;
    if (n!.n >= MAX_PER_USER) return { ok: false, reason: "too_many" } as const;
    for (let attempt = 0; attempt < 5; attempt++) {
      const id = newPublicId();
      const rows = await tx`
        insert into shared_route (public_id, owner_id, name, points, waypoints, distance_km, elevation_gain_m)
        values (${id}, ${i.userId}, ${i.route.name}, ${tx.json(i.route.points)}, ${tx.json(i.route.waypoints)}, ${i.route.distanceKm}, ${i.route.elevationGainM})
        on conflict (public_id) do nothing returning public_id`;
      if (rows.length) return { ok: true, id } as const;
    }
    return { ok: false, reason: "rate_limited" } as const;
  });
}

export async function getSharedRoute(sql: Sql, id: string): Promise<SharedRoute | null> {
  if (!ID.test(id)) return null;
  const [r] = await sql`select name, points, waypoints, distance_km, elevation_gain_m from shared_route where public_id = ${id}`;
  return r ? { name: r.name, points: r.points, waypoints: r.waypoints, distanceKm: Number(r.distance_km), elevationGainM: r.elevation_gain_m } : null;
}

export async function deleteSharedRoute(sql: Sql, i: { userId: string; id: string }): Promise<boolean> {
  if (!ID.test(i.id)) return false;
  const rows = await sql`delete from shared_route where public_id = ${i.id} and owner_id = ${i.userId} returning public_id`;
  return rows.length > 0;
}

export function sharedRouteGpx(r: SharedRoute, link: string): string {
  return writeGpx({ name: r.name, link, points: r.points.map(([lat, lon]) => ({ lat, lon })), waypoints: r.waypoints.map((w) => ({ name: w.name, lat: w.lat, lon: w.lng })) });
}
