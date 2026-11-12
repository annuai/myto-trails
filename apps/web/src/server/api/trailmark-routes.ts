import { getLeaderboard, getMyTrailmarks, setChallenge, setLeaderboardOptIn } from "../trailmarks/trailmarks";
import { ApiError, fail, ok, type RouteDef } from "./http";

const noContent = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export const LEADERBOARD_FAIL = {
  refused: [422, "Leaderboards rank contributions to the map, never speed or distance."],
  unknown_metric: [422, "Rank by verified_contributions, new_discoveries, exploration_diversity, helpful_contributions or challenge_participation."],
  bad_scope: [422, "Scope is india, state or district; state and district need id, a region id."],
  scope_unavailable: [422, "That scope is not available for this ranking."],
} as const;

export const trailmarkRoutes: RouteDef[] = [
  {
    method: "GET", path: "/me/trailmarks", access: "write:submission",
    summary: "Your Trailmarks (a thank-you for helping the map; not money or crypto), achievement progress numbers and challenge progress. ?district= is the region id a district challenge counts in",
    async handler(c) {
      return ok(await getMyTrailmarks(c.sql, { userId: c.userId, districtId: c.url.searchParams.get("district"), now: c.now }));
    },
  },
  {
    method: "PUT", path: "/me/challenges/{id}", access: "write:submission", summary: "Join a challenge. Challenges are optional and nothing counts until you join",
    async handler(c) {
      return (await setChallenge(c.sql, { userId: c.userId, challengeId: c.params.id!, joined: true })) ? noContent() : fail(404, "not_found", "No such challenge.");
    },
  },
  {
    method: "DELETE", path: "/me/challenges/{id}", access: "write:submission", summary: "Leave a challenge",
    async handler(c) {
      return (await setChallenge(c.sql, { userId: c.userId, challengeId: c.params.id!, joined: false })) ? noContent() : fail(404, "not_found", "No such challenge.");
    },
  },
  {
    method: "PUT", path: "/me/leaderboard-opt-in", access: "write:submission", summary: "Choose whether to appear on leaderboards by your public name (body: optIn true or false). Off by default; needs a public rider page",
    async handler(c) {
      const b = await c.body();
      const optIn = typeof b === "object" && b !== null ? (b as { optIn?: unknown }).optIn : undefined;
      if (typeof optIn !== "boolean") throw new ApiError(400, "invalid_request", "Send optIn as true or false.");
      const r = await setLeaderboardOptIn(c.sql, { userId: c.userId, optIn });
      return r.ok ? noContent() : fail(409, r.reason, "Make your rider page public first: the leaderboard shows your public name.");
    },
  },
  {
    method: "GET", path: "/leaderboard", access: "public", cache: "none",
    summary: "Riders who chose to be listed, ranked on contributions to the map (?metric=verified_contributions|new_discoveries|exploration_diversity|helpful_contributions|challenge_participation, ?scope=india|state|district, ?id= region id). Ranking by speed or distance is refused with 422",
    async handler(c) {
      const q = c.url.searchParams;
      const r = await getLeaderboard(c.sql, { metric: q.get("metric"), scope: q.get("scope") ?? undefined, scopeId: q.get("id") ?? undefined });
      if (!r.ok) return fail(LEADERBOARD_FAIL[r.reason][0], r.reason, LEADERBOARD_FAIL[r.reason][1]);
      return ok({ metric: r.metric, scope: r.scope, entries: r.entries });
    },
  },
];
