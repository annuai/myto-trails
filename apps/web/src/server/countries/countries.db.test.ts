// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "../testing/db";
import { seedRegions } from "../db/seed-regions";
import { listCountries, registerInterest } from "./countries";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase();
  await seedRegions(db.sql);
  await db.sql`insert into region (kind, name, slug, iso2, enabled) values ('country', 'Nepal', 'nepal', 'NP', false)`;
});
afterAll(async () => {
  await db.drop();
});

describe("listCountries", () => {
  it("puts open countries first and marks the rest coming soon", async () => {
    const list = await listCountries(db.sql);
    expect(list.map((c) => [c.iso2, c.comingSoon])).toEqual([["IN", false], ["NP", true]]);
  });
});

describe("registerInterest", () => {
  it("stores an email once per country, however often it is sent", async () => {
    expect(await registerInterest(db.sql, { iso2: "NP", email: " Rider@Example.com ", ipHash: "a" })).toEqual({ ok: true });
    expect(await registerInterest(db.sql, { iso2: "NP", email: "rider@example.com", ipHash: "a" })).toEqual({ ok: true });
    const [n] = await db.sql`select count(*)::int as n from country_interest where email = 'rider@example.com'`;
    expect(n!.n).toBe(1);
  });
  it("refuses bad emails, unknown countries and open countries", async () => {
    expect(await registerInterest(db.sql, { iso2: "NP", email: "nope", ipHash: "b" })).toEqual({ ok: false, reason: "invalid" });
    expect(await registerInterest(db.sql, { iso2: "ZZ", email: "a@b.co", ipHash: "b" })).toEqual({ ok: false, reason: "not_found" });
    expect(await registerInterest(db.sql, { iso2: "IN", email: "a@b.co", ipHash: "b" })).toEqual({ ok: false, reason: "already_open" });
  });
  it("limits how many a single address can send in a day", async () => {
    for (let i = 0; i < 10; i++) await registerInterest(db.sql, { iso2: "NP", email: `x${i}@b.co`, ipHash: "spam" });
    expect(await registerInterest(db.sql, { iso2: "NP", email: "y@b.co", ipHash: "spam" })).toEqual({ ok: false, reason: "rate_limited" });
  });
});
