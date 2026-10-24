import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Sql } from "postgres";

/**
 * Applies `*.sql` files from `dir` in filename order. Each file runs in its own transaction and is recorded
 * with a checksum; an already-applied file whose content changed stops the run.
 */
export async function migrate(sql: Sql, dir: string): Promise<{ applied: string[] }> {
  await sql`create table if not exists schema_migrations (
    name text primary key,
    checksum text not null,
    applied_at timestamptz not null default now()
  )`;
  const done = new Map((await sql<{ name: string; checksum: string }[]>`select name, checksum from schema_migrations`).map((r) => [r.name, r.checksum]));
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const applied: string[] = [];

  for (const name of files) {
    const content = readFileSync(join(dir, name), "utf8");
    const checksum = createHash("sha256").update(content).digest("hex");
    const previous = done.get(name);
    if (previous !== undefined) {
      if (previous !== checksum) throw new Error(`Migration ${name} changed after it was applied (checksum mismatch)`);
      continue;
    }
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`insert into schema_migrations (name, checksum) values (${name}, ${checksum})`;
    });
    applied.push(name);
  }
  return { applied };
}
