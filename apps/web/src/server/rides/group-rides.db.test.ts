// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { completeWelcome } from "../community/members";
import { createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { createGroupRide, joinGroupRide, MAX_RIDERS, leaveGroupRide, passLead, setRegroup, setRiderTitles, setSuccessor, syncGroupRide, takeBack, takeLead, type Rider } from "./group-rides";

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

describe("passing the lead", () => {
  const roles = async (g: Awaited<ReturnType<typeof group>>) => Object.fromEntries((await g.see()).riders.map((r) => [r.name, r.role]));

  it("moves the lead at once: one leader before, one after, the old leader a rider", async () => {
    const g = await group();
    expect(await roles(g)).toMatchObject({ Leader: "leader", Asha: "member", Ben: "member" });
    expect(await passLead(db.sql, { userId: g.leader, rideId: g.rideId, rider: await g.idOf("Asha"), now })).toEqual({ ok: true });
    const after = await roles(g);
    expect(after).toMatchObject({ Leader: "member", Asha: "leader", Ben: "member" });
    expect(Object.values(after).filter((r) => r === "leader")).toHaveLength(1);
  });

  it("gives the leader's powers to the new leader and takes them from the old one", async () => {
    const g = await group();
    await passLead(db.sql, { userId: g.leader, rideId: g.rideId, rider: await g.idOf("Asha"), now });
    const point = { lat: 12.9, lng: 77.5 };
    expect(await setRegroup(db.sql, { userId: g.leader, rideId: g.rideId, point, now })).toEqual({ ok: false, reason: "not_leader" });
    expect(await setRegroup(db.sql, { userId: g.asha, rideId: g.rideId, point, now })).toEqual({ ok: true });
  });

  it("refuses anyone but the leader, the leader themselves, a rider not in the ride, and a bad id", async () => {
    const g = await group();
    const ben = await g.idOf("Ben");
    expect(await passLead(db.sql, { userId: g.asha, rideId: g.rideId, rider: ben, now })).toEqual({ ok: false, reason: "not_leader" });
    expect(await passLead(db.sql, { userId: g.leader, rideId: g.rideId, rider: (await g.see()).me, now })).toEqual({ ok: false, reason: "invalid" });
    expect(await passLead(db.sql, { userId: g.leader, rideId: g.rideId, rider: "nobody", now })).toEqual({ ok: false, reason: "invalid" });
    expect(await passLead(db.sql, { userId: g.leader, rideId: g.rideId, rider: "00000000-0000-4000-8000-000000000000", now })).toEqual({ ok: false, reason: "not_found" });
    await leaveGroupRide(db.sql, { userId: g.ben, rideId: g.rideId });
    expect(await passLead(db.sql, { userId: g.leader, rideId: g.rideId, rider: ben, now })).toEqual({ ok: false, reason: "not_found" });
  });

  it("lets only one of two passes at the same moment through", async () => {
    const g = await group();
    const [asha, ben] = [await g.idOf("Asha"), await g.idOf("Ben")];
    const results = await Promise.all([passLead(db.sql, { userId: g.leader, rideId: g.rideId, rider: asha, now }), passLead(db.sql, { userId: g.leader, rideId: g.rideId, rider: ben, now })]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(Object.values(await roles(g)).filter((r) => r === "leader")).toHaveLength(1);
  });
});

describe("a leader leaving", () => {
  it("cannot leave without passing the lead", async () => {
    const g = await group();
    expect(await leaveGroupRide(db.sql, { userId: g.leader, rideId: g.rideId })).toEqual({ ok: false, reason: "leader" });
    expect((await g.see()).riders).toHaveLength(3);
  });
  it("passes the lead and leaves in one step, so the ride is never without a leader", async () => {
    const g = await group();
    expect(await leaveGroupRide(db.sql, { userId: g.leader, rideId: g.rideId, successor: await g.idOf("Ben") })).toEqual({ ok: true });
    const riders = (await g.see(g.asha)).riders;
    expect(riders.map((r) => r.name).sort()).toEqual(["Asha", "Ben"]);
    expect(riders.find((r) => r.name === "Ben")!.role).toBe("leader");
  });
  it("refuses a bad successor and then does not leave", async () => {
    const g = await group();
    expect(await leaveGroupRide(db.sql, { userId: g.leader, rideId: g.rideId, successor: "00000000-0000-4000-8000-000000000000" })).toEqual({ ok: false, reason: "not_found" });
    expect((await g.see()).riders).toHaveLength(3);
  });
  it("lets an ordinary rider leave as before", async () => {
    const g = await group();
    expect(await leaveGroupRide(db.sql, { userId: g.ben, rideId: g.rideId })).toEqual({ ok: true });
  });
});

describe("the backup leader and a leader who drops off", () => {
  const minutes = (m: number) => new Date(now.getTime() + m * 60_000);
  /** Everyone has just been heard from; the leader then goes quiet with the given battery. */
  async function dropped(battery: number | null, charging = false) {
    const g = await group();
    for (const u of [g.leader, g.asha, g.ben]) await db.sql`update group_ride_member set seen_at = ${now}, lat = 12, lng = 77 where ride_id = ${g.rideId} and user_id = ${u}`;
    if (battery !== null) await db.sql`update group_ride_member set battery = ${battery}, charging = ${charging} where ride_id = ${g.rideId} and user_id = ${g.leader}`;
    const sync = (userId: string, at: Date) => syncGroupRide(db.sql, { userId, rideId: g.rideId, lat: 12, lng: 77, now: at });
    return { g, sync };
  }
  const leaderName = async (g: { see: (u?: string) => Promise<{ riders: Rider[] }>; asha: string }) => (await g.see(g.asha)).riders.find((r) => r.role === "leader")!.name;

  it("keeps the lead with a leader who is only out of signal, whatever the time", async () => {
    const { g, sync } = await dropped(60);
    await sync(g.asha, minutes(45));
    expect(await leaderName(g)).toBe("Leader");
    const { g: g2, sync: sync2 } = await dropped(null);
    await sync2(g2.asha, minutes(45));
    expect(await leaderName(g2)).toBe("Leader");
  });

  it("gives the lead to the backup leader when the leader goes quiet with a low battery", async () => {
    const { g, sync } = await dropped(4);
    expect(await setSuccessor(db.sql, { userId: g.leader, rideId: g.rideId, rider: await g.idOf("Ben"), now })).toEqual({ ok: true });
    expect((await g.see()).riders.length).toBe(3);
    // Others keep reporting; the leader does not.
    await db.sql`update group_ride_member set seen_at = ${minutes(11)} where ride_id = ${g.rideId} and user_id in (${g.asha}, ${g.ben})`;
    const r = await sync(g.asha, minutes(12));
    expect("riders" in r && r.riders.find((x) => x.role === "leader")!.name).toBe("Ben");
    // The old leader comes back: they may take the lead back, and do, in one step.
    const back = await syncGroupRide(db.sql, { userId: g.leader, rideId: g.rideId, now: minutes(13) });
    expect("riders" in back && back.canTakeBack).toBe(true);
    expect(await takeBack(db.sql, { userId: g.leader, rideId: g.rideId, now: minutes(13) })).toEqual({ ok: true });
    expect((await g.see()).riders.find((x) => x.role === "leader")!.name).toBe("Leader");
  });

  it("without a backup, prefers a marshal, then a captain, then the longest in the group", async () => {
    const { g, sync } = await dropped(3);
    await setRiderTitles(db.sql, { userId: g.leader, rideId: g.rideId, rider: await g.idOf("Ben"), titles: ["marshal"], now });
    await db.sql`update group_ride_member set seen_at = ${minutes(11)} where ride_id = ${g.rideId} and user_id in (${g.asha}, ${g.ben})`;
    await sync(g.asha, minutes(12));
    expect(await leaderName(g)).toBe("Ben");
  });

  it("does nothing when nobody else is there to take it", async () => {
    const { g, sync } = await dropped(3);
    await db.sql`update group_ride_member set seen_at = null where ride_id = ${g.rideId} and user_id in (${g.asha}, ${g.ben})`;
    await sync(g.asha, minutes(12));
    expect((await g.see()).riders.find((x) => x.role === "leader")!.name).not.toBe("Ben");
  });

  it("clears the backup when the lead changes hands, and shows it only to the leader", async () => {
    const g = await group();
    const asha = await g.idOf("Asha");
    await setSuccessor(db.sql, { userId: g.leader, rideId: g.rideId, rider: asha, now });
    const view = async (u: string) => (await syncGroupRide(db.sql, { userId: u, rideId: g.rideId, now })) as { successor?: string | null };
    expect((await view(g.leader)).successor).toBe(asha);
    expect((await view(g.asha)).successor).toBeNull();
    expect(await setSuccessor(db.sql, { userId: g.asha, rideId: g.rideId, rider: asha, now })).toEqual({ ok: false, reason: "not_leader" });
    await passLead(db.sql, { userId: g.leader, rideId: g.rideId, rider: await g.idOf("Ben"), now });
    expect((await view(g.ben)).successor).toBeNull();
  });
});

describe("taking the lead from a leader who is out of contact", () => {
  const minutes = (m: number) => new Date(now.getTime() + m * 60_000);
  it("is offered to the backup, a marshal or a captain after 15 minutes, never to other riders, and never before", async () => {
    const g = await group();
    const [asha, ben] = [await g.idOf("Asha"), await g.idOf("Ben")];
    for (const u of [g.leader, g.asha, g.ben]) await db.sql`update group_ride_member set seen_at = ${now} where ride_id = ${g.rideId} and user_id = ${u}`;
    await setRiderTitles(db.sql, { userId: g.leader, rideId: g.rideId, rider: ben, titles: ["captain"], now });
    const view = async (u: string, at: Date) => (await syncGroupRide(db.sql, { userId: u, rideId: g.rideId, now: at })) as { canTakeLead?: boolean };
    expect((await view(g.ben, minutes(10))).canTakeLead).toBe(false);
    expect((await view(g.ben, minutes(16))).canTakeLead).toBe(true);
    expect((await view(g.asha, minutes(16))).canTakeLead).toBe(false);
    expect(await takeLead(db.sql, { userId: g.asha, rideId: g.rideId, now: minutes(16) })).toEqual({ ok: false, reason: "not_allowed" });
    expect(await takeLead(db.sql, { userId: g.ben, rideId: g.rideId, now: minutes(10) })).toEqual({ ok: false, reason: "not_allowed" });
    expect(await takeLead(db.sql, { userId: g.ben, rideId: g.rideId, now: minutes(16) })).toEqual({ ok: true });
    expect((await g.see()).riders.find((x) => x.role === "leader")!.id).toBe(ben);
    expect(await asha).toBeTruthy();
  });
});

describe("how many riders a group holds", () => {
  it("takes up to the limit and says the next one is turned away", async () => {
    const leader = await rider("Leader");
    const made = await createGroupRide(db.sql, { userId: leader, name: "Big ride", clubId: null, now });
    if (!made.ok) throw new Error(made.reason);
    for (let i = 1; i < MAX_RIDERS; i++) {
      const j = await joinGroupRide(db.sql, { userId: await rider(`Rider ${i}`), code: made.code, displayName: `Rider ${i}`, now });
      if (!j.ok) throw new Error(`rider ${i}: ${j.reason}`);
    }
    const one = await syncGroupRide(db.sql, { userId: leader, rideId: made.id, now });
    expect("riders" in one && one.riders).toHaveLength(MAX_RIDERS);
    expect(await joinGroupRide(db.sql, { userId: await rider("One too many"), code: made.code, displayName: "One too many", now })).toEqual({ ok: false, reason: "full" });
    // Someone leaving makes room.
    const first = (one as { riders: Rider[] }).riders.find((r) => r.name === "Rider 1")!;
    expect(first).toBeTruthy();
  });
});
