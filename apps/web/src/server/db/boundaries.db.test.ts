// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "../testing/db";
import { countryAt, loadBoundaries, openCountryAt } from "./boundaries";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const square = (x: number, y: number) => ({ type: "Polygon" as const, coordinates: [[[x, y], [x + 10, y], [x + 10, y + 10], [x, y + 10], [x, y]]] });
beforeAll(async () => {
  db = await createTestDatabase();
  await db.sql`insert into region (kind, name, slug, iso2, enabled) values ('country', 'Alpha', 'alpha', 'AA', true), ('country', 'Beta', 'beta', 'BB', false)`;
  await loadBoundaries(db.sql, [{ iso2: "AA", geometry: square(0, 0) }, { iso2: "BB", geometry: square(20, 0) }, { iso2: "ZZ", geometry: square(50, 50) }]);
});
afterAll(async () => {
  await db.drop();
});

describe("country boundaries", () => {
  it("skips an outline whose country has no region row, and loads the rest once", async () => {
    const [n] = await db.sql`select count(*)::int as n from country_boundary`;
    expect(n!.n).toBe(2);
    expect((await loadBoundaries(db.sql, [{ iso2: "AA", geometry: square(0, 0) }])).loaded).toBe(1);
    const [m] = await db.sql`select count(*)::int as n from country_boundary`;
    expect(m!.n).toBe(2);
  });
  it("finds the country that contains a point", async () => {
    expect(await countryAt(db.sql, { lat: 5, lon: 5 })).toMatchObject({ iso2: "AA", enabled: true });
    expect(await countryAt(db.sql, { lat: 5, lon: 25 })).toMatchObject({ iso2: "BB", enabled: false });
  });
  it("returns null in a gap between outlines", async () => {
    expect(await countryAt(db.sql, { lat: 5, lon: 15 })).toBeNull();
  });
  it("says a point is open only in an enabled country", async () => {
    expect(await openCountryAt(db.sql, { lat: 5, lon: 5 })).toBe(true);
    expect(await openCountryAt(db.sql, { lat: 5, lon: 25 })).toBe(false);
    expect(await openCountryAt(db.sql, { lat: 5, lon: 15 })).toBe(false);
  });
});
