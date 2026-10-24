import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "../testing/db";
import { seedRegions } from "./seed-regions";
import { ensureDistrict } from "./regions";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});

describe("seedRegions", () => {
  it("inserts the country and 36 states and union territories, then nothing on a rerun", async () => {
    expect(await seedRegions(db.sql)).toEqual({ inserted: 37 });
    expect(await seedRegions(db.sql)).toEqual({ inserted: 0 });
  });
  it("creates Kerala as a state under India", async () => {
    const [row] = await db.sql`select r.kind, p.slug as parent from region r join region p on p.id = r.parent_id where r.slug = 'kerala'`;
    expect(row).toEqual({ kind: "state", parent: "india" });
  });
});

describe("ensureDistrict", () => {
  it("creates a district once and returns the same id afterwards", async () => {
    const a = await ensureDistrict(db.sql, "kerala", "Wayanad");
    const b = await ensureDistrict(db.sql, "kerala", "Wayanad");
    expect(a).toEqual(b);
    expect(a.slug).toBe("wayanad");
  });
  it("throws for an unknown state", async () => {
    await expect(ensureDistrict(db.sql, "atlantis", "Anywhere")).rejects.toThrow("Unknown state: atlantis");
  });
  it("stores hostile district names literally", async () => {
    const name = "Wayanad'; drop table region;--";
    const d = await ensureDistrict(db.sql, "kerala", name);
    const [row] = await db.sql`select name from region where id = ${d.id}`;
    expect(row!.name).toBe(name);
    const [count] = await db.sql`select count(*)::int as n from region`;
    expect(count!.n).toBeGreaterThan(30);
  });
  it("rejects a district name that cannot form a slug", async () => {
    await expect(ensureDistrict(db.sql, "kerala", "!!!")).rejects.toThrow(/district name/i);
  });
});
