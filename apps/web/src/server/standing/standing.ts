import type { CohortRow, StandingMetric } from "@moto-trails/domain";
import type { Sql, TransactionSql } from "postgres";

type Db = Sql | TransactionSql;

export type RideSummaryInput = { ref: string; day: string; distanceKm: number; durationSec: number; cell: string; bikeClass?: string };

/** Turning it off also deletes every summary this rider uploaded, in the same transaction. */
export async function setOptIn(sql: Sql, i: { userId: string; optIn: boolean }): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`
      insert into rider_standing_pref (user_id, opt_in) values (${i.userId}, ${i.optIn})
      on conflict (user_id) do update set opt_in = excluded.opt_in, updated_at = now()`;
    if (!i.optIn) await tx`delete from ride_summary where user_id = ${i.userId}`;
  });
}

export async function upsertSummaries(sql: Sql, i: { userId: string; rides: RideSummaryInput[] }): Promise<{ ok: true } | { ok: false; reason: "not_opted_in" }> {
  return sql.begin(async (tx) => {
    const [pref] = await tx`select opt_in from rider_standing_pref where user_id = ${i.userId}`;
    if (!pref || pref.opt_in !== true) return { ok: false as const, reason: "not_opted_in" as const };
    for (const r of i.rides) {
      await tx`
        insert into ride_summary (user_id, ride_ref, day, distance_km, duration_s, cell, bike_class)
        values (${i.userId}, ${r.ref}, ${r.day}, ${r.distanceKm}, ${r.durationSec}, ${r.cell}, ${r.bikeClass ?? null})
        on conflict (user_id, ride_ref) do update set day = excluded.day, distance_km = excluded.distance_km,
          duration_s = excluded.duration_s, cell = excluded.cell, bike_class = excluded.bike_class`;
    }
    return { ok: true as const };
  });
}

/** Only the cohort's size and cut points: never a rider's row or name. */
export async function getCohort(sql: Db, i: { cell: string; period: string; metric: StandingMetric }): Promise<CohortRow | null> {
  const [row] = await sql`select n, deciles from cohort_stat where cell = ${i.cell} and period = ${i.period} and metric = ${i.metric}`;
  if (!row) return null;
  return { n: Number(row.n), deciles: (row.deciles as unknown[]).map(Number) };
}
