// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { completeWelcome } from "../community/members";
import { createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { createGroupRide, joinGroupRide, leaveGroupRide, setRiderTitles, syncGroupRide, type Rider } from "./group-rides";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const now = new Date("2026-11-01T06:00:00Z");
beforeAll(async () => { db = await createTestDatabase(); });
afterAll(async () => { await db.drop(); });

const rider = async (name: string) => {
  const id = await makeUser(db.sql, { name });
  await completeWelcome(db.sql, { userId: id, confirmed: true, displayName: name, profilePublic: false, gender: null });
  return id;
};

/** A ride with a leader and two members; `see` reads the riders as the leader's sync shows them. */
async function group() {
  const leader = await rider("Leader"), asha = await rider("Asha"), ben = await rider("Ben");
  const made = await createGroupRide(db.sql, { userId: leader, name: "Sunday", clubId: null, now });
  if (!made.ok) throw new Error(made.reason);
  for (const [userId, displayName] of [[asha, "Asha"], [ben, "Ben"]] as const) {
    const j = await joinGroupRide(db.sql, { userId, code: made.code, displayName, now });
    if (!j.ok) throw new Error(j.reason);
  }
  const see = async (userId = leader): Promise<{ me: string; riders: Rider[] }> => {
    const r = await syncGroupRide(db.sql, { userId, rideId: made.id, now });
    if (!("riders" in r)) throw new Error(r.reason);
    return r;
  };
  const idOf = async (name: string) => (await see()).riders.find((x) => x.name === name)!.id;
  return { leader, asha, ben, rideId: made.id, see, idOf };
}

describe("the leader sets riders' titles", () => {
  const set = (g: { leader: string; rideId: string }, rider: unknown, titles: unknown, userId = g.leader) => setRiderTitles(db.sql, { userId, rideId: g.rideId, rider, titles, now });
  const titlesOf = async (g: Awaited<ReturnType<typeof group>>, id: string, as?: string) => (await g.see(as)).riders.find((x) => x.id === id)!.titles;

  it("gives several titles at once, shows them to everyone on the next sync, and takes them away", async () => {
    const g = await group();
    const asha = await g.idOf("Asha");
    expect(await set(g, asha, ["medic", "sweep"])).toEqual({ ok: true });
    expect(await titlesOf(g, asha)).toEqual(["medic", "sweep"]);
    expect(await titlesOf(g, asha, g.ben)).toEqual(["medic", "sweep"]);
    // The list is replaced as a whole; an empty one takes them all away; others are untouched.
    await set(g, asha, ["captain"]);
    expect(await titlesOf(g, asha)).toEqual(["captain"]);
    expect(await set(g, asha, [])).toEqual({ ok: true });
    const after = (await g.see()).riders;
    expect(after.find((x) => x.id === asha)!.titles).toEqual([]);
    expect(after.flatMap((x) => x.titles)).toHaveLength(0);
  });

  it("lets the leader hold titles too", async () => {
    const g = await group();
    const me = (await g.see()).me;
    expect((await set(g, me, ["captain", "medic"])).ok).toBe(true);
    expect(await titlesOf(g, me)).toEqual(["captain", "medic"]);
  });

  it("shows the title an event gave a rider until the leader sets their titles", async () => {
    const g = await group();
    const ben = await g.idOf("Ben");
    await db.sql`update group_ride_member set event_role = 'marshal' where ride_id = ${g.rideId} and user_id = ${g.ben}`;
    expect(await titlesOf(g, ben)).toEqual(["marshal"]);
    await set(g, ben, ["sweep"]);
    expect(await titlesOf(g, ben)).toEqual(["sweep"]);
    const [row] = await db.sql`select event_role from group_ride_member where ride_id = ${g.rideId} and user_id = ${g.ben}`;
    expect(row!.event_role).toBeNull();
  });

  it("refuses a rider who is not the leader, and leaves the titles as they were", async () => {
    const g = await group();
    const ben = await g.idOf("Ben");
    expect(await set(g, ben, ["marshal"], g.asha)).toEqual({ ok: false, reason: "not_leader" });
    expect(await titlesOf(g, ben)).toEqual([]);
  });

  it("refuses titles that are not the four, and a rider who is not in the ride", async () => {
    const g = await group();
    const ben = await g.idOf("Ben");
    expect(await set(g, ben, ["boss"])).toEqual({ ok: false, reason: "invalid" });
    expect(await set(g, ben, "medic")).toEqual({ ok: false, reason: "invalid" });
    expect(await set(g, undefined, ["medic"])).toEqual({ ok: false, reason: "invalid" });
    // Not an id at all is a bad request; a well-formed id that is not in the ride is not found.
    expect(await set(g, "nobody", ["medic"])).toEqual({ ok: false, reason: "invalid" });
    expect(await set(g, "00000000-0000-4000-8000-000000000000", ["medic"])).toEqual({ ok: false, reason: "not_found" });
    const other = await group();
    expect(await set(g, await other.idOf("Asha"), ["medic"])).toEqual({ ok: false, reason: "not_found" });
  });

  it("does not title a rider who has left", async () => {
    const g = await group();
    const ben = await g.idOf("Ben");
    await leaveGroupRide(db.sql, { userId: g.ben, rideId: g.rideId });
    expect(await set(g, ben, ["medic"])).toEqual({ ok: false, reason: "not_found" });
  });
});
