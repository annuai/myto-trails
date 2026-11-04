import postgres, { type Sql } from "postgres";
import { getDatabaseUrl } from "../env";

export type { Sql };

export function createSql(databaseUrl: string): Sql {
  // prepare:false keeps this compatible with transaction-mode connection poolers (Supabase pooler).
  // One connection while `next build` prerenders pages, so the build cannot use up a small pooler (Supabase session mode allows 15).
  const max = process.env.NEXT_PHASE === "phase-production-build" ? 1 : 5;
  // idle_timeout closes a connection that has done nothing for 20 s. Without it a serverless instance keeps its connections for as long as it
  // lives (sessions were found idle for 11 days), and the small Supabase session pool fills up: every new request then waits for a free session
  // and the API hangs. connect_timeout makes a request that cannot get one fail in 10 s instead of hanging.
  return postgres(databaseUrl, { max, prepare: false, idle_timeout: 20, connect_timeout: 10, onnotice: () => {} });
}

let cached: Sql | undefined;

/** Lazy singleton connection configured from DATABASE_URL. */
export function getSql(): Sql {
  cached ??= createSql(getDatabaseUrl(process.env));
  return cached;
}

/**
 * Runs `fn` in one read-only transaction as the `anon` role, so row-level security and grants
 * enforce the public boundary even if application code is wrong.
 */
export async function withPublicRole<T>(sql: Sql, fn: (tx: Sql) => Promise<T>): Promise<T> {
  return (await sql.begin("read only", async (tx) => {
    await tx`set local role anon`;
    return fn(tx as unknown as Sql);
  })) as T;
}
