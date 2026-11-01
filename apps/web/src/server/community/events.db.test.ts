// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { createClub } from "./clubs";
import { cancelEvent, checkIn, createEvent, getEvent, getPublicEvent, joinEventRide, listEvents, markArrived, parseEventInput, respond, setEventCover, setRole, startEvent } from "./events";
import { completeWelcome } from "./members";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const t0 = new Date("2026-11-01T06:00:00Z");
const startsAt = new Date(t0.getTime() + 2 * 86_400_000);
const HOUR = 3_600_000;
beforeAll(async () => { db = await createTestDatabase(); });
afterAll(async () => { await db.drop(); });

const rider = async (name: string) => {
  const id = await makeUser(db.sql, { name });
  await completeWelcome(db.sql, { userId: id, confirmed: true, displayName: name, profilePublic: false, gender: null });
  return id;
};
const place = { lat: 12.9716, lng: 77.5946 };
const input = (o: Record<string, unknown> = {}) => {
  const p = parseEventInput({ title: "Sunday breakfast ride", placeName: "Nandi gate", ...place, startsAt: startsAt.toISOString(), audience: "open", ...o }, t0);
  if (!p.ok) throw new Error("bad test input");
  return p.v;
};
const host = async (o: Record<string, unknown> = {}, userId?: string) => {
  const u = userId ?? (await rider("Host"));
  const r = await createEvent(db.sql, { userId: u, input: input(o), now: t0 });
  if (!r.ok) throw new Error(r.reason);
  return { hostId: u, id: r.id };
};
let n = 0;
const clubOf = async (owner: string) => {
  const r = await createClub(db.sql, { userId: owner, name: `Event Club ${++n}`, description: "", womenOnly: false, now: t0 });
  if (!r.ok) throw new Error(r.reason);
  return r.clubId;
};


describe("creating", () => {
  it("refuses a start in the past or a year out", () => {
    expect(parseEventInput({ title: "Ride", placeName: "x", ...place, startsAt: new Date(t0.getTime() - 1).toISOString(), audience: "open" }, t0).ok).toBe(false);
    expect(parseEventInput({ title: "Ride", placeName: "x", ...place, startsAt: new Date(t0.getTime() + 366 * 86_400_000).toISOString(), audience: "open" }, t0).ok).toBe(false);
  });
  it("lets a club admin host for the club, and no ordinary member", async () => {
    const admin = await rider("Admin");
    const clubId = await clubOf(admin);
    expect((await createEvent(db.sql, { userId: admin, input: input({ clubId, audience: "members" }), now: t0 })).ok).toBe(true);
    expect(await createEvent(db.sql, { userId: await rider("Stranger"), input: input({ clubId }), now: t0 })).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("visibility", () => {
  it("hides a members-only event from a non-member as if it did not exist", async () => {
    const admin = await rider("Admin2");
    const clubId = await clubOf(admin);
    const r = await createEvent(db.sql, { userId: admin, input: input({ clubId, audience: "members" }), now: t0 });
    if (!r.ok) throw new Error(r.reason);
    expect(await getEvent(db.sql, { userId: await rider("Outsider"), eventId: r.id, now: t0 })).toEqual({ ok: false, reason: "not_found" });
    expect(await getPublicEvent(db.sql, r.id, t0)).toBeNull();
    const listed = await listEvents(db.sql, { userId: await rider("Outsider2"), scope: "discover", now: t0 });
    expect(listed.ok && listed.items.some((e) => e.id === r.id)).toBe(false);
  });
});

describe("replying", () => {
  it("waitlists past capacity and promotes the longest waiting rider when a seat opens", async () => {
    const { id } = await host({ capacity: 2 });
    const [a, b] = [await rider("A"), await rider("B")];
    // The host already holds one of the two seats.
    expect(await respond(db.sql, { userId: a, eventId: id, response: "going", now: t0 })).toMatchObject({ ok: true, response: "going" });
    expect(await respond(db.sql, { userId: b, eventId: id, response: "going", now: t0 })).toMatchObject({ ok: true, response: "waitlisted" });
    await respond(db.sql, { userId: a, eventId: id, response: "declined", reason: "work", now: t0 });
    const [row] = await db.sql`select response from ride_event_rsvp x join ride_event e on e.id = x.event_id where e.public_id = ${id} and x.user_id = ${b}`;
    expect(row!.response).toBe("going");
  });
  it("never exceeds capacity when two riders race for the last seat", async () => {
    const { id } = await host({ capacity: 2 });
    const riders = await Promise.all([rider("R1"), rider("R2"), rider("R3")]);
    await Promise.all(riders.map((u) => respond(db.sql, { userId: u, eventId: id, response: "going", now: t0 })));
    const [{ n: going }] = await db.sql`select count(*)::int as n from ride_event_rsvp x join ride_event e on e.id = x.event_id where e.public_id = ${id} and x.response = 'going'`;
    expect(going).toBe(2);
  });
  it("shows a decline note to the host only", async () => {
    const h = await host();
    const a = await rider("Decliner");
    await respond(db.sql, { userId: a, eventId: h.id, response: "declined", reason: "bike", note: "Chain snapped", now: t0 });
    const asHost = await getEvent(db.sql, { userId: h.hostId, eventId: h.id, now: t0 });
    expect(asHost.ok && asHost.event.roster?.find((r) => r.note === "Chain snapped")?.reason).toBe("bike");
    const asRider = await getEvent(db.sql, { userId: a, eventId: h.id, now: t0 });
    expect(asRider.ok && asRider.event.roster).toBeNull();
    expect(JSON.stringify(asRider)).not.toContain("Chain snapped");
  });
  it("won't let the host decline their own event", async () => {
    const h = await host();
    expect(await respond(db.sql, { userId: h.hostId, eventId: h.id, response: "declined", now: t0 })).toEqual({ ok: false, reason: "host" });
  });
});

const near = new Date(startsAt.getTime() - 10 * 60_000);
describe("checking in", () => {
  it("accepts a rider at the meeting point, refuses early, far and poor fixes, and refuses the waitlisted", async () => {
    const { id } = await host({ capacity: 2 });
    const a = await rider("Arriver");
    await respond(db.sql, { userId: a, eventId: id, response: "going", now: t0 });
    expect(await checkIn(db.sql, { userId: a, eventId: id, ...place, accuracyM: 10, now: new Date(startsAt.getTime() - 2 * HOUR) })).toEqual({ ok: false, reason: "early" });
    expect(await checkIn(db.sql, { userId: a, eventId: id, lat: 13.2, lng: 77.5946, accuracyM: 10, now: near })).toEqual({ ok: false, reason: "far" });
    expect(await checkIn(db.sql, { userId: a, eventId: id, ...place, accuracyM: 400, now: near })).toEqual({ ok: false, reason: "inaccurate" });
    expect(await checkIn(db.sql, { userId: a, eventId: id, ...place, accuracyM: 10, now: near })).toMatchObject({ ok: true });
    const late = await rider("Late");
    expect(await respond(db.sql, { userId: late, eventId: id, response: "going", now: t0 })).toMatchObject({ response: "waitlisted" });
    expect(await checkIn(db.sql, { userId: late, eventId: id, ...place, accuracyM: 10, now: near })).toEqual({ ok: false, reason: "waitlisted" });
  });
  it("lets the host mark a rider arrived", async () => {
    const h = await host();
    const a = await rider("NoGps");
    await respond(db.sql, { userId: a, eventId: h.id, response: "going", now: t0 });
    const handle = (await db.sql`select public_id from app_user where id = ${a}`)[0]!.public_id as string;
    expect(await markArrived(db.sql, { hostId: h.hostId, eventId: h.id, riderHandle: handle, now: near })).toEqual({ ok: true });
  });
});

describe("starting the ride", () => {
  it("turns the event into a group ride that checked-in riders join with their role", async () => {
    const h = await host();
    const a = await rider("Sweeper");
    const handle = (await db.sql`select public_id from app_user where id = ${a}`)[0]!.public_id as string;
    await respond(db.sql, { userId: a, eventId: h.id, response: "going", now: t0 });
    await setRole(db.sql, { hostId: h.hostId, eventId: h.id, riderHandle: handle, role: "sweep", now: t0 });
    const go = new Date(startsAt.getTime() - 30 * 60_000);
    expect(await startEvent(db.sql, { hostId: h.hostId, eventId: h.id, now: new Date(startsAt.getTime() - 2 * HOUR) })).toEqual({ ok: false, reason: "early" });
    expect(await startEvent(db.sql, { hostId: h.hostId, eventId: h.id, now: go })).toEqual({ ok: true });
    expect(await joinEventRide(db.sql, { userId: a, eventId: h.id, displayName: "Sweeper", now: go })).toEqual({ ok: false, reason: "not_checked_in" });
    await checkIn(db.sql, { userId: a, eventId: h.id, ...place, accuracyM: 10, now: go });
    const joined = await joinEventRide(db.sql, { userId: a, eventId: h.id, displayName: "Sweeper", now: go });
    expect(joined).toMatchObject({ ok: true, role: "member" });
    const [m] = await db.sql`select event_role from group_ride_member where user_id = ${a} and ride_id = ${(joined as { rideId: string }).rideId}`;
    expect(m!.event_role).toBe("sweep");
  });
  it("cannot be cancelled once live", async () => {
    const h = await host();
    await startEvent(db.sql, { hostId: h.hostId, eventId: h.id, now: new Date(startsAt.getTime() - 30 * 60_000) });
    expect(await cancelEvent(db.sql, { hostId: h.hostId, eventId: h.id })).toEqual({ ok: false, reason: "closed" });
  });
});

describe("cover photo", () => {
  const stranger = "11111111-1111-4111-8111-111111111111";
  it("lets only the host set it, and only with one of their own uploads", async () => {
    const h = await host();
    expect(await setEventCover(db.sql, { hostId: await rider("NotHost"), eventId: h.id, mediaId: null })).toEqual({ ok: false, reason: "not_host" });
    expect(await setEventCover(db.sql, { hostId: h.hostId, eventId: h.id, mediaId: stranger })).toEqual({ ok: false, reason: "invalid" });
    expect(await setEventCover(db.sql, { hostId: h.hostId, eventId: h.id, mediaId: null })).toEqual({ ok: true, coverUrl: null });
  });
  it("refuses to create an event with someone else's upload as its cover", async () => {
    const u = await rider("Cover host");
    expect(await createEvent(db.sql, { userId: u, input: input({ coverMediaId: stranger }), now: t0 })).toEqual({ ok: false, reason: "invalid" });
  });
});
