/**
 * Achievements are data. A badge is a row in ACHIEVEMENTS; adding one is adding a row, not code. Each is evaluated by a pure function over
 * a progress snapshot. They reward exploring, contributing and helping other riders: never speed, distance as a score, or streaks.
 */
export const ACHIEVEMENT_CATEGORIES = ["exploration", "community", "contribution", "personal"] as const;
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];
export const CATEGORY_TITLES: Record<AchievementCategory, string> = { exploration: "Exploration", community: "Community", contribution: "Contribution", personal: "Personal" };

/** What a snapshot can hold, and who knows it: `phone` metrics come from the rider's own device, `server` ones from the Trailmarks ledger and the rider's saved history. */
export const METRICS = {
  trailsRiddenDistinct: "server",
  districtsRiddenDistinct: "server",
  weekendsRidden: "phone",
  approvedTrails: "server",
  verifiedReports: "server",
  helpfulContributions: "server",
  trailmarksTotal: "server",
} as const;
export type Metric = keyof typeof METRICS;

/** A metric left out of the snapshot is unknown (offline, signed out), which is different from zero. */
export type ProgressSnapshot = Partial<Record<Metric, number>>;

export type Criteria =
  | { type: "threshold"; metric: Metric; atLeast: number }
  /** Cannot be computed honestly from data that exists yet. The badge stays locked and says what it is waiting for. */
  | { type: "needs"; needs: string };

export type AchievementDef = {
  id: string;
  category: AchievementCategory;
  title: string;
  /** What earns it, in one plain line. */
  hint: string;
  criteria: Criteria;
  /** Shown while a `needs` badge is locked. */
  lockedHint?: string;
};

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: "explorer", category: "exploration", title: "Explorer", hint: "Ride 10 different trails.", criteria: { type: "threshold", metric: "trailsRiddenDistinct", atLeast: 10 } },
  { id: "weekend-wanderer", category: "exploration", title: "Weekend Wanderer", hint: "Ride on 5 different weekends. They do not have to be in a row.", criteria: { type: "threshold", metric: "weekendsRidden", atLeast: 5 } },
  { id: "scenic-seeker", category: "exploration", title: "Scenic Seeker", hint: "Visit 5 scenic viewpoints.", criteria: { type: "needs", needs: "viewpoint_visits" }, lockedHint: "Waiting for viewpoints on trails. Not counted yet." },
  { id: "western-ghats-explorer", category: "exploration", title: "Western Ghats Explorer", hint: "Ride 5 trails in the Western Ghats.", criteria: { type: "needs", needs: "trail_collection_membership" }, lockedHint: "Waiting for the Western Ghats trail collection. Not counted yet." },
  { id: "trailkeeper", category: "contribution", title: "Trailkeeper", hint: "Get 5 trail reports, confirmations or corrections accepted.", criteria: { type: "threshold", metric: "verifiedReports", atLeast: 5 } },
  { id: "pathfinder", category: "contribution", title: "Pathfinder", hint: "Add a new trail that moderators approve.", criteria: { type: "threshold", metric: "approvedTrails", atLeast: 1 } },
  { id: "pioneer", category: "contribution", title: "Pioneer", hint: "Be the first to add an approved trail in a district.", criteria: { type: "needs", needs: "first_in_district" }, lockedHint: "Waiting for first-in-district tracking. Not counted yet." },
  { id: "community-rider", category: "community", title: "Community Rider", hint: "Help the map 10 times: confirmations, photos, places, corrections.", criteria: { type: "threshold", metric: "helpfulContributions", atLeast: 10 } },
];

export type AchievementState = "earned" | "in_progress" | "locked" | "needs_data";
export type AchievementStatus = { def: AchievementDef; state: AchievementState; current: number; target: number; fraction: number; hint: string };

export function evaluate(def: AchievementDef, snap: ProgressSnapshot): AchievementStatus {
  const c = def.criteria;
  if (c.type === "needs") return { def, state: "needs_data", current: 0, target: 0, fraction: 0, hint: def.lockedHint ?? "Not counted yet." };
  const value = snap[c.metric];
  if (value === undefined) {
    const where = METRICS[c.metric] === "server" ? "Sign in and go online to see this." : "Not counted yet.";
    return { def, state: "needs_data", current: 0, target: c.atLeast, fraction: 0, hint: where };
  }
  const current = Math.max(0, value);
  const earned = current >= c.atLeast;
  return { def, state: earned ? "earned" : current > 0 ? "in_progress" : "locked", current: Math.min(current, c.atLeast), target: c.atLeast, fraction: Math.min(1, current / c.atLeast), hint: def.hint };
}

export const evaluateAll = (snap: ProgressSnapshot, defs: readonly AchievementDef[] = ACHIEVEMENTS) => defs.map((d) => evaluate(d, snap));

/** Statuses grouped by category, in the order of ACHIEVEMENT_CATEGORIES; empty categories are left out. */
export function byCategory(statuses: readonly AchievementStatus[]): { category: AchievementCategory; items: AchievementStatus[] }[] {
  return ACHIEVEMENT_CATEGORIES.map((category) => ({ category, items: statuses.filter((s) => s.def.category === category) })).filter((g) => g.items.length > 0);
}
