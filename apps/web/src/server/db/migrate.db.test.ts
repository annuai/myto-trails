import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "../testing/db";
import { migrate } from "./migrate";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase({ migrations: false });
});
afterAll(async () => {
  await db.drop();
});

const exists = async (table: string) => {
  const [row] = await db.sql`select to_regclass(${`public.${table}`}) as reg`;
  return row?.reg !== null;
};

describe("migrate", () => {
  const dir = mkdtempSync(join(tmpdir(), "migrations-"));
  writeFileSync(join(dir, "0001_a.sql"), "create table t1 (id int);");
  writeFileSync(join(dir, "0002_b.sql"), "create table t2 (id int);\ncreate index t2_id on t2 (id);");

  it("applies new files in filename order and records them", async () => {
    expect((await migrate(db.sql, dir)).applied).toEqual(["0001_a.sql", "0002_b.sql"]);
    expect(await exists("t1")).toBe(true);
    expect(await exists("t2")).toBe(true);
  });

  it("is idempotent", async () => {
    expect((await migrate(db.sql, dir)).applied).toEqual([]);
  });

  it("refuses to continue when an applied file has changed", async () => {
    writeFileSync(join(dir, "0001_a.sql"), "create table t1 (id int, extra text);");
    await expect(migrate(db.sql, dir)).rejects.toThrow(/checksum/);
    writeFileSync(join(dir, "0001_a.sql"), "create table t1 (id int);");
  });

  it("rolls back a failing migration completely", async () => {
    writeFileSync(join(dir, "0003_bad.sql"), "create table t3 (id int);\nselect * from table_that_does_not_exist;");
    await expect(migrate(db.sql, dir)).rejects.toThrow();
    expect(await exists("t3")).toBe(false);
    const rows = await db.sql`select name from schema_migrations where name = '0003_bad.sql'`;
    expect(rows).toHaveLength(0);
  });
});
