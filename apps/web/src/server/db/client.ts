import postgres, { type Sql } from "postgres";
import { EnvError, loadServerEnv } from "../env";

export type { Sql };

export function createSql(databaseUrl: string): Sql {
  // prepare:false keeps this compatible with transaction-mode connection poolers (Supabase pooler).
  return postgres(databaseUrl, { max: 5, prepare: false, onnotice: () => {} });
}

let cached: Sql | undefined;

/** Lazy singleton connection configured from DATABASE_URL. */
export function getSql(): Sql {
  if (!cached) {
    const url = loadServerEnv(process.env).databaseUrl;
    if (!url) throw new EnvError("Missing environment variables: DATABASE_URL", ["DATABASE_URL"]);
    cached = createSql(url);
  }
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
