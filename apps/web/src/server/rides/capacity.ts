/** How many riders a group ride holds, and what the organiser can buy to raise it. Everything here is configuration, not law. */
export type Plan = "free" | "large_ride_pass" | "organiser";

export type CapacityConfig = {
  limits: Record<Plan, number>;
  /** In paise, shown to the organiser only. The amount charged is whatever the billing provider says. */
  pricesPaise: { large_ride_pass: number; organiser_month: number };
};

/** The free limit stays at the old 100 until a real purchase path exists, so nobody is stopped with no way to pay. */
export const DEFAULT_CAPACITY: CapacityConfig = {
  limits: { free: 100, large_ride_pass: 20, organiser: 50 },
  pricesPaise: { large_ride_pass: 9900, organiser_month: 24900 },
};

const positive = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export function capacityConfig(env: Record<string, string | undefined> = process.env): CapacityConfig {
  const d = DEFAULT_CAPACITY;
  return {
    limits: {
      free: positive(env.GROUP_RIDE_FREE_LIMIT, d.limits.free),
      large_ride_pass: positive(env.GROUP_RIDE_PASS_LIMIT, d.limits.large_ride_pass),
      organiser: positive(env.GROUP_RIDE_ORGANISER_LIMIT, d.limits.organiser),
    },
    pricesPaise: {
      large_ride_pass: positive(env.GROUP_RIDE_PASS_PRICE_PAISE, d.pricesPaise.large_ride_pass),
      organiser_month: positive(env.GROUP_RIDE_ORGANISER_PRICE_PAISE, d.pricesPaise.organiser_month),
    },
  };
}

export type EntitlementRow = { kind: "large_ride_pass" | "organiser"; rideId: string | null; status: string; startsAt: Date; endsAt: Date | null };

const live = (e: EntitlementRow, now: Date) => e.status === "active" && e.startsAt <= now && (e.endsAt === null || e.endsAt > now);

/** The best plan the ride's leader holds for this ride. A cancelled, refunded, failed, pending or ended entitlement counts for nothing. */
export function planFor(rideId: string, rows: EntitlementRow[], now: Date): Plan {
  const mine = rows.filter((e) => live(e, now));
  if (mine.some((e) => e.kind === "organiser")) return "organiser";
  if (mine.some((e) => e.kind === "large_ride_pass" && e.rideId === rideId)) return "large_ride_pass";
  return "free";
}

/** The most riders this ride may hold. Never lower than the free limit, so a lapsed pass cannot shrink a ride below its free size. */
export function limitFor(plan: Plan, config: CapacityConfig = capacityConfig()): number {
  return Math.max(config.limits.free, config.limits[plan]);
}

/** What the organiser sees when the ride is full: what they have, and what would raise it. */
export function upgradeOptions(plan: Plan, config: CapacityConfig = capacityConfig()) {
  const opts: { plan: Exclude<Plan, "free">; limit: number; pricePaise: number; per: "ride" | "month" }[] = [];
  if (plan === "free" && config.limits.large_ride_pass > config.limits.free) opts.push({ plan: "large_ride_pass", limit: config.limits.large_ride_pass, pricePaise: config.pricesPaise.large_ride_pass, per: "ride" });
  if (plan !== "organiser" && config.limits.organiser > limitFor(plan, config)) opts.push({ plan: "organiser", limit: config.limits.organiser, pricePaise: config.pricesPaise.organiser_month, per: "month" });
  return opts;
}
