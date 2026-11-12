import { CHALLENGES, challengeProgress, rideChallengeEvents, decideAward, parseLeaderboardMetric, rankRiders, TRAILMARK_ACTIONS, TRAILMARK_RULES, TRAILMARKS_NOTE, trailmarkTotal } from "@moto-trails/domain";
import type { AwardDecision, ChallengeEvent, ChallengeProgress, ContributionState, LeaderboardEntry, LeaderboardMetric, LeaderboardScope, ProgressSnapshot, TrailmarkAction } from "@moto-trails/domain";
import type { Sql, TransactionSql } from "postgres";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = 86_400_000;
type Db = Sql | TransactionSql;

export type AwardInput = {
  userId: string;
  action: TrailmarkAction;
  refType: "submission" | "trail_report" | "condition_report" | "media" | "place";
  refId: string;
  trailId?: string | null;
  /** Where the contribution stands. Only "approved" ever earns anything. */
  state: ContributionState;
  /** The moderator, or the riders, who approved or confirmed it. */
  confirmedBy: readonly string[];
  now: Date;
};

/**
 * THE SEAM. Every Trailmark is awarded through here, by server code, after moderation or verification approved the contribution.
 * Call it from the place that approves, in the same transaction. Current callers: moderation/decisions.approve (new trail, edit),
 * moderation/reports.resolveReport (accepted report) and rides/condition-reports.confirmConditionReport (confirmed by other riders).
 * Not yet called: trail photographs and place contributions, because nothing moderates them yet. When one does, call this where its
 * approval is recorded with action "trail_photos" or "place_contribution".
 * Never throws for a refusal: it answers with the reason. The ledger's unique key is the last line of defence against double awards.
 */
export async function awardTrailmarks(sql: Db, i: AwardInput): Promise<AwardDecision & { inserted: boolean }> {
  if (!UUID.test(i.userId) || !UUID.test(i.refId) || !(TRAILMARK_ACTIONS as readonly string[]).includes(i.action)) return { award: false, reason: "not_approved", inserted: false };
  // Two awards for one rider and action are decided one after the other, so the daily cap cannot be beaten by racing.
  await sql`select pg_advisory_xact_lock(hashtext(${`trailmark:${i.userId}:${i.action}`}))`;
  const [dup] = await sql`select 1 as x from trailmark_event where action = ${i.action} and ref_type = ${i.refType} and ref_id = ${i.refId}`;
  const [today] = await sql`select count(*)::int as n from trailmark_event where user_id = ${i.userId} and action = ${i.action} and awarded_at > ${new Date(i.now.getTime() - DAY)}`;
  const decision = decideAward({ action: i.action, state: i.state, userId: i.userId, confirmedBy: i.confirmedBy, awardedToday: today!.n as number, alreadyAwarded: Boolean(dup) });
  if (!decision.award) return { ...decision, inserted: false };
  const rows = await sql`
    insert into trailmark_event (user_id, action, points, ref_type, ref_id, trail_id, awarded_at)
    values (${i.userId}, ${i.action}, ${decision.points}, ${i.refType}, ${i.refId}, ${i.trailId ?? null}, ${i.now})
    on conflict (action, ref_type, ref_id) do nothing returning id`;
  return { ...decision, inserted: rows.length > 0 };
}

/**
 * Awards inside a larger transaction without letting a ledger problem undo the approval itself: a savepoint is rolled back, the
 * caller carries on. The contribution simply stays unawarded.
 */
export async function awardInTransaction(tx: TransactionSql, i: AwardInput): Promise<void> {
  try {
    await tx.savepoint((sp) => awardTrailmarks(sp, i));
  } catch {
    /* the approval stands; nothing was awarded */
  }
}

const VERIFIED = ["trail_report", "condition_confirmed", "correction"];
const HELPFUL = ["trail_photos", "place_contribution", "condition_confirmed", "correction"];

export type MyTrailmarks = {
  total: number;
  note: string;
  recent: { action: TrailmarkAction; label: string; points: number; at: string }[];
  snapshot: ProgressSnapshot;
  challenges: ChallengeProgress[];
  leaderboardOptIn: boolean;
};

/** A rider's own Trailmarks, achievement metrics and challenge progress. `districtId` is the district a district challenge counts in. */
export async function getMyTrailmarks(sql: Sql, i: { userId: string; districtId?: string | null; now: Date }): Promise<MyTrailmarks> {
  const district = i.districtId && UUID.test(i.districtId) ? i.districtId : null;
  const [events, ridden, enrolled, pref, standing, summaries] = await Promise.all([
    sql`select action, points, awarded_at from trailmark_event where user_id = ${i.userId} order by awarded_at desc`,
    sql`select r.created_at, t.region_id from trail_ridden r join trail t on t.id = r.trail_id and t.lifecycle = 'published' where r.user_id = ${i.userId}`,
    sql`select challenge_id, joined_at from challenge_enrolment where user_id = ${i.userId}`,
    sql`select leaderboard_opt_in from rider_game_pref where user_id = ${i.userId}`,
    sql`select opt_in from rider_standing_pref where user_id = ${i.userId}`,
    // Only the rider's own summaries, and only while they are opted in (opting out deletes them anyway).
    sql`select s.ride_ref, s.day, s.distance_km from ride_summary s join rider_standing_pref p on p.user_id = s.user_id and p.opt_in where s.user_id = ${i.userId}`,
  ]);
  const rideOptIn = standing[0]?.opt_in === true;
  const count = (actions: string[]) => events.filter((e) => actions.includes(e.action)).length;
  const snapshot: ProgressSnapshot = {
    trailsRiddenDistinct: ridden.length,
    districtsRiddenDistinct: new Set(ridden.map((r) => r.region_id)).size,
    approvedTrails: count(["new_trail"]),
    verifiedReports: count(VERIFIED),
    helpfulContributions: count(HELPFUL),
    trailmarksTotal: trailmarkTotal(events as unknown as { points: number }[]),
  };
  const challengeEvents: ChallengeEvent[] = [
    ...ridden.map((r) => ({ kind: "new_trails" as const, at: r.created_at as Date, districtId: r.region_id as string })),
    ...events.filter((e) => VERIFIED.includes(e.action)).map((e) => ({ kind: "verifications" as const, at: e.awarded_at as Date })),
    ...(rideOptIn ? rideChallengeEvents(summaries.map((r) => ({ rideRef: r.ride_ref as string, day: r.day as Date, distanceKm: Number(r.distance_km) }))) : []),
  ];
  const joined = new Map(enrolled.map((r) => [r.challenge_id as string, r.joined_at as Date]));
  return {
    total: snapshot.trailmarksTotal!,
    note: TRAILMARKS_NOTE,
    recent: events.slice(0, 10).map((e) => ({ action: e.action, label: TRAILMARK_RULES[e.action as TrailmarkAction].label, points: e.points, at: (e.awarded_at as Date).toISOString() })),
    snapshot,
    challenges: CHALLENGES.map((def) => challengeProgress(def, { joinedAt: joined.get(def.id) ?? null, events: challengeEvents, districtId: district, now: i.now, rideOptIn })),
    leaderboardOptIn: Boolean(pref[0]?.leaderboard_opt_in),
  };
}

/** Joining is a choice, and leaving is too. Joining a challenge that does not exist is refused. */
export async function setChallenge(sql: Sql, i: { userId: string; challengeId: string; joined: boolean }): Promise<boolean> {
  if (!CHALLENGES.some((c) => c.id === i.challengeId)) return false;
  if (i.joined) await sql`insert into challenge_enrolment (user_id, challenge_id) values (${i.userId}, ${i.challengeId}) on conflict do nothing`;
  else await sql`delete from challenge_enrolment where user_id = ${i.userId} and challenge_id = ${i.challengeId}`;
  return true;
}

/** Appearing on a leaderboard needs a public profile, because the public name is what is shown. */
export async function setLeaderboardOptIn(sql: Sql, i: { userId: string; optIn: boolean }): Promise<{ ok: true } | { ok: false; reason: "profile_not_public" }> {
  if (i.optIn) {
    const [u] = await sql`select profile_public from app_user where id = ${i.userId} and status = 'active'`;
    if (!u?.profile_public) return { ok: false, reason: "profile_not_public" };
  }
  await sql`insert into rider_game_pref (user_id, leaderboard_opt_in) values (${i.userId}, ${i.optIn}) on conflict (user_id) do update set leaderboard_opt_in = excluded.leaderboard_opt_in, updated_at = now()`;
  return { ok: true };
}

export type LeaderboardQuery = { metric: unknown; scope?: unknown; scopeId?: unknown };
export type LeaderboardResult =
  | { ok: true; metric: LeaderboardMetric; scope: LeaderboardScope; entries: LeaderboardEntry[] }
  | { ok: false; reason: "refused" | "unknown_metric" | "bad_scope" | "scope_unavailable" };

/**
 * The leaderboard: opted-in riders with a public profile, ranked on contribution only. Speed and distance are refused before any SQL
 * runs. India, a state or a district can filter it; "collection" is not offered because the only collections that exist are
 * private to their owners. Challenge participation is counted across India only.
 */
export async function getLeaderboard(sql: Sql, q: LeaderboardQuery): Promise<LeaderboardResult> {
  const m = parseLeaderboardMetric(q.metric);
  if (!m.ok) return { ok: false, reason: m.reason === "refused" ? "refused" : "unknown_metric" };
  const scope = (q.scope ?? "india") as string;
  if (scope === "collection") return { ok: false, reason: "scope_unavailable" };
  if (scope !== "india" && scope !== "state" && scope !== "district") return { ok: false, reason: "bad_scope" };
  const id = typeof q.scopeId === "string" && UUID.test(q.scopeId) ? q.scopeId : null;
  if (scope !== "india" && !id) return { ok: false, reason: "bad_scope" };
  if (m.metric === "challenge_participation" && scope !== "india") return { ok: false, reason: "scope_unavailable" };

  const inScope = (t: string) => (scope === "state" ? sql`${sql(t)}.state_id = ${id!}` : scope === "district" ? sql`${sql(t)}.region_id = ${id!}` : sql`true`);
  let rows;
  if (m.metric === "challenge_participation") {
    rows = await sql`
      select u.public_id, u.display_name, count(*)::int as value
      from challenge_enrolment c join app_user u on u.id = c.user_id and u.status = 'active' and u.profile_public
      join rider_game_pref p on p.user_id = u.id and p.leaderboard_opt_in
      group by u.id order by value desc, u.display_name limit 100`;
  } else if (m.metric === "exploration_diversity") {
    rows = await sql`
      select u.public_id, u.display_name, count(distinct t.region_id)::int as value
      from trail_ridden r join trail t on t.id = r.trail_id and t.lifecycle = 'published' and ${inScope("t")}
      join app_user u on u.id = r.user_id and u.status = 'active' and u.profile_public
      join rider_game_pref p on p.user_id = u.id and p.leaderboard_opt_in
      group by u.id order by value desc, u.display_name limit 100`;
  } else {
    const actions = m.metric === "verified_contributions" ? VERIFIED : m.metric === "new_discoveries" ? ["new_trail"] : HELPFUL;
    rows = await sql`
      select u.public_id, u.display_name, count(*)::int as value
      from trailmark_event e left join trail t on t.id = e.trail_id
      join app_user u on u.id = e.user_id and u.status = 'active' and u.profile_public
      join rider_game_pref p on p.user_id = u.id and p.leaderboard_opt_in
      where e.action = any(${actions}::text[]) and (${scope === "india"} or (t.id is not null and ${inScope("t")}))
      group by u.id order by value desc, u.display_name limit 100`;
  }
  const zero = { verified_contributions: 0, new_discoveries: 0, exploration_diversity: 0, helpful_contributions: 0, challenge_participation: 0 };
  const entries = rankRiders(rows.map((r) => ({ publicName: r.display_name as string, publicId: r.public_id as string, optedIn: true, counts: { ...zero, [m.metric]: r.value as number } })), m.metric);
  return { ok: true, metric: m.metric, scope: scope as LeaderboardScope, entries };
}
