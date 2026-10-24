import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import postgres, { type Sql } from "postgres";
import { migrate } from "../db/migrate";
import { withPublicRole } from "../db/client";

const MIGRATIONS_DIR = fileURLToPath(new URL("../../../db/migrations", import.meta.url));

export type TestDatabase = { url: string; sql: Sql; drop(): Promise<void> };

/** Creates an isolated database on TEST_ADMIN_URL (default: the local dev cluster) and applies the migrations. */
export async function createTestDatabase(opts: { migrations?: false } = {}): Promise<TestDatabase> {
  const adminUrl = process.env.TEST_ADMIN_URL ?? "postgres://localhost:54329/postgres";
  const name = `moto_test_${randomBytes(6).toString("hex")}`;
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
  // Roles belong to the whole cluster, so test files running in parallel can race to create them (the migration does
  // the same check). Create them here first, tolerating the race.
  for (const role of ["anon", "authenticated"]) {
    await admin.unsafe(`do $$ begin create role ${role} nologin; exception when duplicate_object or unique_violation then null; end $$`);
  }
  await admin.unsafe(`create database "${name}"`);

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const sql = postgres(url.toString(), { max: 5, prepare: false, onnotice: () => {} });
  if (opts.migrations !== false) await migrate(sql, MIGRATIONS_DIR);

  return {
    url: url.toString(),
    sql,
    async drop() {
      await sql.end({ timeout: 5 });
      await admin.unsafe(`drop database if exists "${name}" with (force)`);
      await admin.end({ timeout: 5 });
    },
  };
}

/** Runs queries as the anonymous role, read-only, exactly like the public site does. */
export const asAnon = withPublicRole;
