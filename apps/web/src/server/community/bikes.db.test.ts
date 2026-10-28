// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAnon, createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { listBikeMakes, listBikeModels } from "./bikes";
import { getBike, saveBike } from "./profile";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});

const IMAGE = { "400": "https://cdn.test/bike/x-400.webp", "800": "https://cdn.test/bike/x-800.webp" };
async function model(o: { slug: string; make?: string; model?: string; category?: string; image?: boolean; active?: boolean }) {
  const make = o.make ?? "Royal Enfield";
  const [mk] = await db.sql`insert into bike_make (slug, name) values (${make.toLowerCase().replace(/ /g, "-")}, ${make}) on conflict (slug) do update set name = excluded.name returning id`;
  const [m] = await db.sql`
    insert into bike_model (slug, make_id, model, category, image_variants, active)
    values (${o.slug}, ${mk!.id}, ${o.model ?? o.slug}, ${o.category ?? "adventure"}, ${db.sql.json(o.image ? IMAGE : {})}, ${o.active ?? true}) returning id`;
  return m!.id as string;
}

describe("bike catalogue tables", () => {
  it.each(["bike_make", "bike_model"])("anon cannot read %s", async (table) => {
    await expect(asAnon(db.sql, (tx) => tx`select * from ${tx(table)} limit 1`)).rejects.toThrow(/permission denied/);
  });

  it("checks the slug, the category and the year range, and keeps slugs unique", async () => {
    await model({ slug: "check-base" });
    await expect(model({ slug: "Bad Slug" })).rejects.toThrow();
    await expect(model({ slug: "check-base" })).rejects.toThrow();
    await expect(model({ slug: "check-cat", category: "hovercraft" })).rejects.toThrow();
    const [mk] = await db.sql`select id from bike_make limit 1`;
    await expect(db.sql`insert into bike_model (slug, make_id, model, category, year_from, year_to) values ('check-years', ${mk!.id}, 'x', 'retro', 2020, 2010)`).rejects.toThrow();
  });
});

describe("listBikeModels and listBikeMakes", () => {
  it("lists only models with an image by default, everything with all, and never inactive ones", async () => {
    await model({ slug: "list-a", make: "ListMake", model: "Alpha", image: true });
    await model({ slug: "list-b", make: "ListMake", model: "Beta", category: "retro" });
    await model({ slug: "list-c", make: "ListMake", model: "Gamma", image: true, active: false });
    const shown = await listBikeModels(db.sql, { make: "listmake" });
    expect(shown.items.map((m) => m.slug)).toEqual(["list-a"]);
    expect(shown.items[0]).toMatchObject({ make: "ListMake", image: IMAGE });
    const all = await listBikeModels(db.sql, { make: "listmake", all: true });
    expect(all.items.map((m) => m.slug)).toEqual(["list-a", "list-b"]);
    expect(all.items[1]!.image).toBeNull();
    expect((await listBikeModels(db.sql, { make: "listmake", all: true, category: "retro" })).items.map((m) => m.slug)).toEqual(["list-b"]);
    expect((await listBikeModels(db.sql, { make: "listmake", all: true, q: "bet" })).items.map((m) => m.slug)).toEqual(["list-b"]);
    expect((await listBikeModels(db.sql, { all: true, q: "100%" })).items).toEqual([]);
    expect((await listBikeMakes(db.sql)).items.find((m) => m.slug === "listmake")).toMatchObject({ models: 1 });
    expect((await listBikeMakes(db.sql, { all: true })).items.find((m) => m.slug === "listmake")).toMatchObject({ models: 2 });
  });
});

describe("a rider's bike and the one-image rule", () => {
  it("shows the catalogue image, then the rider's own photo over it, and keeps the model when the name is edited", async () => {
    const u = await makeUser(db.sql);
    const id = await model({ slug: "rule-a", image: true });
    expect(await saveBike(db.sql, { userId: u, name: "Scram 411", modelYear: 2023, bikeModelId: id })).toEqual({ ok: true });
    expect(await getBike(db.sql, u)).toEqual({ name: "Scram 411", modelYear: 2023, photoUrl: IMAGE["400"], ownPhoto: false, bikeModelId: id });

    const [media] = await db.sql`
      insert into media (uploaded_by, alt_text, variants) values (${u}, 'My bike', ${db.sql.json({ "400": "own-400" })}) returning id`;
    expect(await saveBike(db.sql, { userId: u, name: "My Scram", modelYear: 2023, photoMediaId: media!.id })).toEqual({ ok: true });
    expect(await getBike(db.sql, u)).toMatchObject({ name: "My Scram", photoUrl: "own-400", ownPhoto: true, bikeModelId: id });

    expect(await saveBike(db.sql, { userId: u, name: "My Scram", modelYear: null, photoMediaId: null, bikeModelId: null })).toEqual({ ok: true });
    expect(await getBike(db.sql, u)).toMatchObject({ photoUrl: null, ownPhoto: false, bikeModelId: null });
  });

  it("refuses an unknown, inactive or malformed model", async () => {
    const u = await makeUser(db.sql);
    const inactive = await model({ slug: "rule-off", active: false });
    for (const bikeModelId of [crypto.randomUUID(), inactive, "not-a-uuid"]) {
      expect(await saveBike(db.sql, { userId: u, name: "Some bike", modelYear: null, bikeModelId })).toEqual({ ok: false, reason: "invalid" });
    }
    expect(await getBike(db.sql, u)).toBeNull();
  });
});
