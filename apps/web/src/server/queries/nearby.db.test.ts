// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "../testing/db";
import { insertTrailFixture } from "../testing/fixtures";
import { nearbyTrails } from "./nearby";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const now = new Date("2026-06-01T12:00:00Z");
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});
const at = (name: string, lon: number, lat: number, o = {}) => insertTrailFixture(db.sql, { name, state: { slug: "nb-state", name: "Nb State" }, district: null, startPoint: { lon, lat }, mediaCount: 1, ...o });

describe("nearbyTrails", () => {
  it("returns the closest trails first with distance, travel time and cover, within 300 km", async () => {
    const near = await at("Near trail", 77.6, 12.9);
    const mid = await at("Mid trail", 77.6, 13.9); // about 111 km north
    await at("Far trail", 80.6, 20.9); // well outside 300 km
    const r = await nearbyTrails(db.sql, { lat: 12.97, lon: 77.59 }, now);
    if (!r.ok) throw new Error();
    expect(r.items.map((i) => i.slug)).toEqual([near.slug, mid.slug]);
    expect(r.items[0]!.distanceFromKm).toBeLessThan(15);
    expect(r.items[1]!.distanceFromKm).toBeGreaterThan(90);
    expect(r.items[0]!.travel).toMatchObject({ oneWayMin: expect.any(Number) });
    expect(r.items[0]!.cover).not.toBeNull();
  });

  it("uses the public point of a sensitive trail, never its exact start", async () => {
    const t = await at("Sensitive near", 77.61, 12.91, { sensitivity: "sensitive", publicPoint: { lon: 77.8, lat: 13.1 } });
    const r = await nearbyTrails(db.sql, { lat: 12.97, lon: 77.59 }, now);
    if (!r.ok) throw new Error();
    const item = r.items.find((i) => i.slug === t.slug)!;
    expect(item.lat).toBeCloseTo(13.1, 3);
    expect(item.distanceFromKm).toBeGreaterThan(18); // measured to the public point (about 25 km), not the 2 km exact start
  });

  it("caps the list at six and hides closed trails", async () => {
    for (let i = 0; i < 8; i++) await at(`Crowd ${i}`, 75 + i * 0.01, 15.0);
    await at("Closed crowd", 75.0, 15.0, { conditionStatus: "permanently_closed" });
    const r = await nearbyTrails(db.sql, { lat: 15.0, lon: 75.0 }, now);
    if (!r.ok) throw new Error();
    expect(r.items).toHaveLength(6);
    expect(r.items.map((i) => i.name)).not.toContain("Closed crowd");
  });

  it("rejects junk and places far outside India without querying", async () => {
    for (const p of [{ lat: "x", lon: 1 }, { lat: NaN, lon: 77 }, { lat: 100, lon: 77 }, { lat: null, lon: undefined }]) {
      expect(await nearbyTrails(db.sql, p, now)).toEqual({ ok: false, reason: "invalid" });
    }
    expect(await nearbyTrails(db.sql, { lat: 51.5, lon: -0.1 }, now)).toEqual({ ok: false, reason: "outside" });
  });
});
