// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "../testing/db";
import { seedCountry, seedRegions } from "../db/seed-regions";
import { COUNTRY_CONFIGS } from "@moto-trails/domain";
import { canActIn, getActor } from "./actor";
import { makeUser } from "../testing/submission-fixture";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
let india: string;
let nepal: string;
beforeAll(async () => {
  db = await createTestDatabase();
  await seedRegions(db.sql);
  await seedCountry(db.sql, { config: { ...COUNTRY_CONFIGS.IN!, iso2: "NP", name: "Nepal" }, slug: "nepal", enabled: false, admin1: [{ name: "Bagmati", slug: "bagmati" }] });
  india = (await db.sql`select id from region where iso2 = 'IN'`)[0]!.id;
  nepal = (await db.sql`select id from region where iso2 = 'NP'`)[0]!.id;
});
afterAll(async () => {
  await db.drop();
});

describe("moderator country scope", () => {
  it("a moderator acts in their own country only", async () => {
    const actor = (await getActor(db.sql, await makeUser(db.sql, { role: "moderator" })))!;
    expect(canActIn(actor, india)).toBe(true);
    expect(canActIn(actor, nepal)).toBe(false);
    expect(canActIn(actor, null)).toBe(false);
  });
  it("an admin acts everywhere, including on a trail with no country yet", async () => {
    const actor = (await getActor(db.sql, await makeUser(db.sql, { role: "admin" })))!;
    expect(canActIn(actor, india)).toBe(true);
    expect(canActIn(actor, nepal)).toBe(true);
    expect(canActIn(actor, null)).toBe(true);
  });
  it("a moderator granted no country acts nowhere", async () => {
    const [u] = await db.sql`insert into app_user (email, display_name) values ('nocountry@example.test', 'No Country') returning id`;
    await db.sql`insert into user_role (user_id, role) values (${u!.id}, 'moderator')`;
    expect(canActIn((await getActor(db.sql, u!.id as string))!, india)).toBe(false);
  });
});
