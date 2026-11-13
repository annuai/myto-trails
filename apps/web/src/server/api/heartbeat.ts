import type { Sql } from "../db/client";

/** Records that `job` finished now. Never throws: a failed heartbeat must not fail the job it describes. */
export async function recordHeartbeat(sql: Sql, job: string): Promise<void> {
  try {
    await sql`insert into cron_heartbeat (job, last_ok_at) values (${job}, now())
      on conflict (job) do update set last_ok_at = excluded.last_ok_at`;
  } catch {
    // The watchdog will report the missing heartbeat; the sweep result matters more.
  }
}

/** Minutes since `job` last finished, or null when it never has. */
export async function minutesSinceHeartbeat(sql: Sql, job: string): Promise<number | null> {
  const rows = await sql<{ minutes: number }[]>`select extract(epoch from (now() - last_ok_at)) / 60 as minutes from cron_heartbeat where job = ${job}`;
  return rows[0] ? Number(rows[0].minutes) : null;
}
