import { MIN_COHORT, parseStandingMetric } from "@moto-trails/domain";
import { getCohort, setOptIn, upsertSummaries, type RideSummaryInput } from "../standing/standing";
import { ApiError, fail, ok, type RouteDef } from "./http";

const noContent = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;
const CELL = /^(-?[1-9][0-9]{0,2}|0):(-?[1-9][0-9]{0,2}|0)$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const FIVE_YEARS = 5 * 366 * 86_400_000;
/** A real calendar day, not in the future and not older than five years. */
function validDay(d: string, now: Date): boolean {
  const t = Date.parse(d);
  if (!DAY.test(d) || Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== d) return false;
  // One day of slack: riders east of UTC (India) upload today's local date before UTC midnight.
  return t <= now.getTime() + 86_400_000 && t >= now.getTime() - FIVE_YEARS;
}
/** A 1-degree cell: lat -90..89, lng -180..179. */
function validCell(s: string): boolean {
  if (!CELL.test(s)) return false;
  const [lat, lng] = s.split(":").map(Number) as [number, number];
  return lat >= -90 && lat <= 89 && lng >= -180 && lng <= 179;
}
const MAX_RIDES = 200;
// The only keys an upload may carry. Anything else (lat, lng, route, startedAt, waypoints) is refused outright, not ignored.
const ALLOWED = new Set(["ref", "day", "distanceKm", "durationSec", "cell", "bikeClass"]);

const bad = (m: string) => new ApiError(400, "invalid_request", m);

function parseRide(raw: unknown, now: Date): RideSummaryInput {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw bad("Each ride is an object.");
  const r = raw as Record<string, unknown>;
  for (const k of Object.keys(r)) if (!ALLOWED.has(k)) throw bad(`Only ref, day, distanceKm, durationSec, cell and bikeClass are accepted; "${k}" is not.`);
  const day = typeof r.day === "string" && validDay(r.day, now) ? r.day : null;
  if (typeof r.ref !== "string" || r.ref.length < 1 || r.ref.length > 80) throw bad("ref is 1 to 80 characters.");
  if (day === null) throw bad("day is a real YYYY-MM-DD, not in the future and within five years.");
  if (typeof r.distanceKm !== "number" || !Number.isFinite(r.distanceKm) || r.distanceKm < 0 || r.distanceKm >= 5000) throw bad("distanceKm is a number from 0 to under 5000.");
  if (typeof r.durationSec !== "number" || !Number.isInteger(r.durationSec) || r.durationSec < 0 || r.durationSec > 2_000_000) throw bad("durationSec is a whole number of seconds.");
  if (typeof r.cell !== "string" || !validCell(r.cell)) throw bad("cell is a grid cell like 12:77.");
  if (r.bikeClass !== undefined && (typeof r.bikeClass !== "string" || r.bikeClass.length < 1 || r.bikeClass.length > 30)) throw bad("bikeClass is 1 to 30 characters.");
  return { ref: r.ref, day, distanceKm: r.distanceKm, durationSec: r.durationSec, cell: r.cell, ...(r.bikeClass !== undefined ? { bikeClass: r.bikeClass as string } : {}) };
}

export const standingRoutes: RouteDef[] = [
  {
    method: "PUT", path: "/me/standing-opt-in", access: "write:submission",
    summary: "Choose whether your coarse ride summaries count toward area cohorts (body: optIn true or false). Off by default; turning it off deletes the summaries you uploaded",
    async handler(c) {
      const b = await c.body();
      const optIn = typeof b === "object" && b !== null ? (b as { optIn?: unknown }).optIn : undefined;
      if (typeof optIn !== "boolean") throw bad("Send optIn as true or false.");
      await setOptIn(c.sql, { userId: c.userId, optIn });
      return noContent();
    },
  },
  {
    method: "PUT", path: "/me/ride-summaries", access: "write:submission",
    summary: "Upload coarse ride summaries (body: rides, up to 200 of ref, day, distanceKm, durationSec, cell and optional bikeClass). No route, coordinates or times are accepted: any other key is refused with 400. 409 not_opted_in until you opt in",
    async handler(c) {
      const b = await c.body();
      if (typeof b !== "object" || b === null || Array.isArray(b)) throw bad("Send { rides: [...] }.");
      const body = b as Record<string, unknown>;
      for (const k of Object.keys(body)) if (k !== "rides") throw bad(`Only rides is accepted; "${k}" is not.`);
      if (!Array.isArray(body.rides) || body.rides.length > MAX_RIDES) throw bad(`rides is a list of at most ${MAX_RIDES}.`);
      const rides = body.rides.map((x) => parseRide(x, c.now));
      const r = await upsertSummaries(c.sql, { userId: c.userId, rides });
      return r.ok ? noContent() : fail(409, r.reason, "Turn on ride standing first; nothing is stored until you do.");
    },
  },
  {
    method: "GET", path: "/cohort", access: "public", cache: "none",
    summary: "Size and ten-percent cut points for a 1-degree cell in a month (?cell=12:77, ?period=YYYY-MM, ?metric=distance_km|rides|longest_ride_km). Never a rider's row or name. Ranking by speed is refused with 422",
    async handler(c) {
      const q = c.url.searchParams;
      const m = parseStandingMetric(q.get("metric"));
      if (!m.ok) return m.reason === "refused" ? fail(422, "refused", "Standing never ranks speed.") : fail(422, "unknown_metric", "Metric is distance_km, rides or longest_ride_km.");
      const cell = q.get("cell") ?? "";
      const period = q.get("period") ?? "";
      if (!validCell(cell)) throw bad("cell is a grid cell like 12:77.");
      if (!PERIOD.test(period)) throw bad("period is YYYY-MM.");
      const row = await getCohort(c.sql, { cell, period, metric: m.metric });
      // Belt and braces: the rollup never writes n < MIN_COHORT, but a small cohort would expose near-exact personal numbers.
      return row && row.n >= MIN_COHORT ? ok({ n: row.n, deciles: row.deciles }) : fail(404, "not_found", "No cohort for that cell yet.");
    },
  },
];
