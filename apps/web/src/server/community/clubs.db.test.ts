// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { JOIN_PHONE_RETENTION_DAYS } from "./constants";
import {
  createClub, decideJoinRequest, getClub, leaveClub, listClubs, searchClubs, listFeed, listJoinRequests, postToClub, purgeJoinPhones, removeMember,
  requestJoin, respondToRide, setMemberRole, hidePost, withdrawJoinRequest,
} from "./clubs";
import { completeWelcome } from "./members";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const t0 = new Date("2026-10-24T12:00:00Z");
const days = (n: number) => new Date(t0.getTime() + n * 86_400_000);
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});
const rider = async (name: string, o: { woman?: boolean; declared?: boolean } = {}) => {
  const id = await makeUser(db.sql, { name });
  if (o.declared !== false) await completeWelcome(db.sql, { userId: id, confirmed: true, displayName: name, profilePublic: false, isWoman: o.woman === true });
  return id;
};
let n = 0;
const club = async (owner: string, o: { womenOnly?: boolean } = {}) => {
  const r = await createClub(db.sql, { userId: owner, name: `Trail Club ${++n}`, description: "Weekend dirt riders", womenOnly: o.womenOnly === true, now: t0 });
  if (!r.ok) throw new Error(r.reason);
  return r.clubId;
};
const phoneInDb = async (clubId: string) => (await db.sql`select r.phone_ciphertext from club_join_request r join club c on c.id = r.club_id where c.public_id = ${clubId}`).map((r) => r.phone_ciphertext);

describe("creating clubs", () => {
  it("makes the creator the admin, and needs the declaration, a sane name and a free name", async () => {
    const a = await rider("Asha");
    const id = await club(a);
    expect((await getClub(db.sql, { userId: a, clubId: id }))).toMatchObject({ role: "admin", memberCount: 1 });
    expect(await createClub(db.sql, { userId: await rider("Undeclared", { declared: false }), name: "Some Club", description: "", womenOnly: false, now: t0 })).toEqual({ ok: false, reason: "not_member" });
    expect(await createClub(db.sql, { userId: a, name: "ab", description: "", womenOnly: false, now: t0 })).toEqual({ ok: false, reason: "invalid" });
    expect(await createClub(db.sql, { userId: a, name: "Visit www.spam.com", description: "", womenOnly: false, now: t0 })).toEqual({ ok: false, reason: "invalid" });
    const [{ name }] = await db.sql`select name from club where public_id = ${id}`;
    expect(await createClub(db.sql, { userId: await rider("Other"), name: String(name).toUpperCase(), description: "", womenOnly: false, now: t0 })).toEqual({ ok: false, reason: "name_taken" });
  });

  it("limits how many clubs one rider can create", async () => {
    const a = await rider("Prolific");
    for (let i = 0; i < 2; i++) await createClub(db.sql, { userId: a, name: `Prolific ${i} club`, description: "", womenOnly: false, now: t0 });
    expect(await createClub(db.sql, { userId: a, name: "Prolific third", description: "", womenOnly: false, now: t0 })).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("lets only women (by their own flag) create women-only clubs", async () => {
    expect(await createClub(db.sql, { userId: await rider("Man"), name: "Women only ride", description: "", womenOnly: true, now: t0 })).toEqual({ ok: false, reason: "women_only" });
    expect(await createClub(db.sql, { userId: await rider("Woman", { woman: true }), name: "Women only ride", description: "", womenOnly: true, now: t0 })).toMatchObject({ ok: true });
  });
});

describe("browsing", () => {
  it("shows the club list only to declared members", async () => {
    const a = await rider("Lister");
    const id = await club(a);
    expect((await listClubs(db.sql, a)).map((c) => c.clubId)).toContain(id);
    expect(await listClubs(db.sql, await rider("Nobody", { declared: false }))).toEqual([]);
  });

  it("shows posts only to members of that club", async () => {
    const a = await rider("Owner");
    const id = await club(a);
    await postToClub(db.sql, { userId: a, clubId: id, body: "Welcome riders", now: t0 });
    const outsider = await rider("Outsider");
    expect(await listFeed(db.sql, { userId: outsider, clubId: id })).toBeNull();
    expect((await listFeed(db.sql, { userId: a, clubId: id }))!.posts[0]).toMatchObject({ body: "Welcome riders", authorName: "Owner" });
  });
});

describe("join requests and phone numbers", () => {
  it("lets a rider request with a phone number that only the club's admins can read", async () => {
    const admin = await rider("Admin A");
    const id = await club(admin);
    const joiner = await rider("Joiner J");
    expect(await requestJoin(db.sql, { userId: joiner, clubId: id, phone: "98123 45678", message: "Ride most Sundays", now: t0 })).toMatchObject({ ok: true });
    expect((await phoneInDb(id))[0]).not.toContain("9812345678");
    expect(await listJoinRequests(db.sql, { userId: joiner, clubId: id })).toBeNull();
    expect(await listJoinRequests(db.sql, { userId: await rider("Random"), clubId: id })).toBeNull();
    const list = (await listJoinRequests(db.sql, { userId: admin, clubId: id }))!;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: "Joiner J", phone: "+919812345678", message: "Ride most Sundays", status: "pending" });
  });

  it("needs a valid phone number, the declaration, and refuses duplicates and members", async () => {
    const admin = await rider("Admin B");
    const id = await club(admin);
    const j = await rider("Joiner K");
    expect(await requestJoin(db.sql, { userId: j, clubId: id, phone: "12345", now: t0 })).toEqual({ ok: false, reason: "invalid" });
    expect(await requestJoin(db.sql, { userId: await rider("Undeclared2", { declared: false }), clubId: id, phone: "9812345678", now: t0 })).toEqual({ ok: false, reason: "not_member" });
    expect(await requestJoin(db.sql, { userId: j, clubId: id, phone: "9812345678", now: t0 })).toMatchObject({ ok: true });
    expect(await requestJoin(db.sql, { userId: j, clubId: id, phone: "9812345678", now: t0 })).toEqual({ ok: false, reason: "already_pending" });
    expect(await requestJoin(db.sql, { userId: admin, clubId: id, phone: "9812345678", now: t0 })).toEqual({ ok: false, reason: "already_member" });
    expect(await requestJoin(db.sql, { userId: j, clubId: "00000000-0000-4000-8000-000000000000", phone: "9812345678", now: t0 })).toEqual({ ok: false, reason: "not_found" });
  });

  it("accepting makes a member and keeps the number visible to admins for 7 days, then wipes it", async () => {
    const admin = await rider("Admin C");
    const id = await club(admin);
    const j = await rider("Joiner L");
    const r = await requestJoin(db.sql, { userId: j, clubId: id, phone: "9812345678", now: t0 });
    if (!r.ok) throw new Error(r.reason);
    expect(await decideJoinRequest(db.sql, { userId: j, requestId: r.requestId, accept: true, now: t0 })).toEqual({ ok: false, reason: "not_admin" });
    expect(await decideJoinRequest(db.sql, { userId: admin, requestId: r.requestId, accept: true, now: t0 })).toMatchObject({ ok: true, clubName: expect.any(String) });
    expect((await getClub(db.sql, { userId: j, clubId: id }))!.role).toBe("member");
    expect((await listJoinRequests(db.sql, { userId: admin, clubId: id }, days(JOIN_PHONE_RETENTION_DAYS - 1)))![0]).toMatchObject({ status: "accepted", phone: "+919812345678" });
    expect(await purgeJoinPhones(db.sql, days(JOIN_PHONE_RETENTION_DAYS - 1))).toBe(0);
    expect(await purgeJoinPhones(db.sql, days(JOIN_PHONE_RETENTION_DAYS + 1))).toBe(1);
    expect((await listJoinRequests(db.sql, { userId: admin, clubId: id }, days(JOIN_PHONE_RETENTION_DAYS + 1)))![0]!.phone).toBeNull();
    expect(await phoneInDb(id)).toEqual([null]);
  });

  it("hides the number from the list once the retention time has passed, even before the sweep runs", async () => {
    const admin = await rider("Admin D");
    const id = await club(admin);
    const j = await rider("Joiner M");
    const r = await requestJoin(db.sql, { userId: j, clubId: id, phone: "9812345678", now: t0 });
    if (!r.ok) throw new Error(r.reason);
    await decideJoinRequest(db.sql, { userId: admin, requestId: r.requestId, accept: false, now: t0 });
    expect((await listJoinRequests(db.sql, { userId: admin, clubId: id }, days(8)))![0]!.phone).toBeNull();
  });

  it("wipes the number when the rider withdraws, and a declined rider can ask again later", async () => {
    const admin = await rider("Admin E");
    const id = await club(admin);
    const j = await rider("Joiner N");
    const r = await requestJoin(db.sql, { userId: j, clubId: id, phone: "9812345678", now: t0 });
    if (!r.ok) throw new Error(r.reason);
    expect(await withdrawJoinRequest(db.sql, { userId: j, clubId: id })).toEqual({ ok: true });
    expect(await phoneInDb(id)).toEqual([null]);
    expect(await requestJoin(db.sql, { userId: j, clubId: id, phone: "9812345678", now: t0 })).toMatchObject({ ok: true });
  });

  it("only lets women request to join a women-only club", async () => {
    const owner = await rider("Owner W", { woman: true });
    const id = await club(owner, { womenOnly: true });
    expect(await requestJoin(db.sql, { userId: await rider("Man W"), clubId: id, phone: "9812345678", now: t0 })).toEqual({ ok: false, reason: "women_only" });
    expect(await requestJoin(db.sql, { userId: await rider("Woman W", { woman: true }), clubId: id, phone: "9812345678", now: t0 })).toMatchObject({ ok: true });
  });

  it("limits how many requests a rider can send in a day", async () => {
    const j = await rider("Eager");
    let last: unknown;
    for (let i = 0; i < 6; i++) last = await requestJoin(db.sql, { userId: j, clubId: await club(await rider(`Owner Eager ${i}`)), phone: "9812345678", now: t0 });
    expect(last).toEqual({ ok: false, reason: "rate_limited" });
  });
});

describe("members and admins", () => {
  const joined = async () => {
    const admin = await rider("Adm");
    const id = await club(admin);
    const m = await rider("Mem");
    const r = await requestJoin(db.sql, { userId: m, clubId: id, phone: "9812345678", now: t0 });
    if (!r.ok) throw new Error(r.reason);
    await decideJoinRequest(db.sql, { userId: admin, requestId: r.requestId, accept: true, now: t0 });
    return { admin, id, m };
  };

  it("keeps at least one admin and lets members leave", async () => {
    const { admin, id, m } = await joined();
    expect(await leaveClub(db.sql, { userId: admin, clubId: id })).toEqual({ ok: false, reason: "last_admin" });
    expect(await setMemberRole(db.sql, { userId: admin, clubId: id, memberId: (await getClub(db.sql, { userId: m, clubId: id }))!.myHandle, role: "admin" })).toEqual({ ok: true });
    expect(await leaveClub(db.sql, { userId: admin, clubId: id })).toEqual({ ok: true });
    expect(await listFeed(db.sql, { userId: admin, clubId: id })).toBeNull();
  });

  it("lets only admins remove members or change roles", async () => {
    const { admin, id, m } = await joined();
    const adminHandle = (await getClub(db.sql, { userId: admin, clubId: id }))!.myHandle;
    const memberHandle = (await getClub(db.sql, { userId: m, clubId: id }))!.myHandle;
    expect(await removeMember(db.sql, { userId: m, clubId: id, memberId: adminHandle })).toEqual({ ok: false, reason: "not_admin" });
    expect(await setMemberRole(db.sql, { userId: m, clubId: id, memberId: memberHandle, role: "admin" })).toEqual({ ok: false, reason: "not_admin" });
    expect(await removeMember(db.sql, { userId: admin, clubId: id, memberId: memberHandle })).toEqual({ ok: true });
    expect(await listFeed(db.sql, { userId: m, clubId: id })).toBeNull();
  });
});

describe("posts and ride plans", () => {
  const withMember = async () => {
    const admin = await rider("Poster Admin");
    const id = await club(admin);
    const m = await rider("Poster Member");
    const r = await requestJoin(db.sql, { userId: m, clubId: id, phone: "9812345678", now: t0 });
    if (!r.ok) throw new Error(r.reason);
    await decideJoinRequest(db.sql, { userId: admin, requestId: r.requestId, accept: true, now: t0 });
    return { admin, id, m };
  };

  it("lets members post and reply, refuses links, and non-members cannot post", async () => {
    const { admin, id, m } = await withMember();
    const p = await postToClub(db.sql, { userId: admin, clubId: id, body: "Sunday ride to Nandi?", now: t0 });
    if (!p.ok) throw new Error(p.reason);
    expect(await postToClub(db.sql, { userId: m, clubId: id, body: "Count me in", parentId: p.postId, now: t0 })).toMatchObject({ ok: true });
    expect(await postToClub(db.sql, { userId: m, clubId: id, body: "see https://spam.example", now: t0 })).toEqual({ ok: false, reason: "invalid" });
    expect(await postToClub(db.sql, { userId: await rider("Stranger"), clubId: id, body: "hello there", now: t0 })).toEqual({ ok: false, reason: "not_member" });
    const feed = (await listFeed(db.sql, { userId: m, clubId: id }))!;
    expect(feed.posts).toHaveLength(1);
    expect(feed.posts[0]!.replies.map((r) => r.body)).toEqual(["Count me in"]);
  });

  it("supports ride plans with going or maybe, one answer each, changeable and removable", async () => {
    const { admin, id, m } = await withMember();
    const p = await postToClub(db.sql, { userId: admin, clubId: id, body: "Meet at 6 am at the Hebbal flyover", ridePlan: { at: days(5), place: "Hebbal flyover" }, now: t0 });
    if (!p.ok) throw new Error(p.reason);
    expect(await postToClub(db.sql, { userId: admin, clubId: id, body: "Past ride", ridePlan: { at: days(-1), place: "x" }, now: t0 })).toEqual({ ok: false, reason: "invalid" });
    expect(await respondToRide(db.sql, { userId: m, postId: p.postId, response: "going" })).toEqual({ ok: true });
    expect(await respondToRide(db.sql, { userId: admin, postId: p.postId, response: "maybe" })).toEqual({ ok: true });
    let post = (await listFeed(db.sql, { userId: m, clubId: id }))!.posts[0]!;
    expect(post).toMatchObject({ kind: "ride_plan", place: "Hebbal flyover", going: 1, maybe: 1, myResponse: "going" });
    expect(await respondToRide(db.sql, { userId: m, postId: p.postId, response: "maybe" })).toEqual({ ok: true });
    expect(await respondToRide(db.sql, { userId: m, postId: p.postId, response: null })).toEqual({ ok: true });
    post = (await listFeed(db.sql, { userId: m, clubId: id }))!.posts[0]!;
    expect(post).toMatchObject({ going: 0, maybe: 1, myResponse: null });
    expect(await respondToRide(db.sql, { userId: await rider("Stranger2"), postId: p.postId, response: "going" })).toEqual({ ok: false, reason: "not_member" });
  });

  it("lets authors and admins hide a post, and nobody else", async () => {
    const { admin, id, m } = await withMember();
    const p = await postToClub(db.sql, { userId: m, clubId: id, body: "A rude post", now: t0 });
    if (!p.ok) throw new Error(p.reason);
    const q = await postToClub(db.sql, { userId: admin, clubId: id, body: "Admin post", now: t0 });
    if (!q.ok) throw new Error(q.reason);
    expect(await hidePost(db.sql, { userId: m, postId: q.postId })).toEqual({ ok: false, reason: "not_allowed" });
    expect(await hidePost(db.sql, { userId: admin, postId: p.postId })).toEqual({ ok: true });
    expect((await listFeed(db.sql, { userId: m, clubId: id }))!.posts.map((x) => x.body)).toEqual(["Admin post"]);
  });

  it("limits posting rate", async () => {
    const { admin, id } = await withMember();
    let last: unknown;
    for (let i = 0; i < 21; i++) last = await postToClub(db.sql, { userId: admin, clubId: id, body: `Post ${i}`, now: t0 });
    expect(last).toEqual({ ok: false, reason: "rate_limited" });
  });

describe("review fixes", () => {
  it("finds a club by id even when more than 100 newer clubs exist", async () => {
    const a = await rider("Old Owner");
    const id = await club(a);
    for (let k = 0; k < 101; k++) {
      await db.sql`insert into club (name, created_by, created_at) values (${`Filler club ${k}`}, ${a}, now() + interval '1 day')`;
    }
    expect(await getClub(db.sql, { userId: a, clubId: id })).toMatchObject({ clubId: id, role: "admin" });
  });

  it("never lets two admins remove each other at the same time", async () => {
    const a = await rider("Race A");
    const id = await club(a);
    const b = await rider("Race B");
    const r = await requestJoin(db.sql, { userId: b, clubId: id, phone: "9812345678", now: t0 });
    if (!r.ok) throw new Error(r.reason);
    await decideJoinRequest(db.sql, { userId: a, requestId: r.requestId, accept: true, now: t0 });
    const handleA = (await getClub(db.sql, { userId: a, clubId: id }))!.myHandle;
    const handleB = (await getClub(db.sql, { userId: b, clubId: id }))!.myHandle;
    await setMemberRole(db.sql, { userId: a, clubId: id, memberId: handleB, role: "admin" });
    await Promise.all([
      removeMember(db.sql, { userId: a, clubId: id, memberId: handleB }),
      removeMember(db.sql, { userId: b, clubId: id, memberId: handleA }),
    ]);
    const [{ n }] = await db.sql`select count(*)::int as n from club_member m join club c on c.id = m.club_id where c.public_id = ${id} and m.role = 'admin'`;
    expect(n).toBeGreaterThanOrEqual(1);
  });

  it("does not count a suspended admin when keeping at least one admin", async () => {
    const a = await rider("Active Admin");
    const id = await club(a);
    const b = await rider("Sleeper");
    const r = await requestJoin(db.sql, { userId: b, clubId: id, phone: "9812345678", now: t0 });
    if (!r.ok) throw new Error(r.reason);
    await decideJoinRequest(db.sql, { userId: a, requestId: r.requestId, accept: true, now: t0 });
    await setMemberRole(db.sql, { userId: a, clubId: id, memberId: (await getClub(db.sql, { userId: b, clubId: id }))!.myHandle, role: "admin" });
    await db.sql`update app_user set status = 'suspended' where id = ${b}`;
    expect(await leaveClub(db.sql, { userId: a, clubId: id })).toEqual({ ok: false, reason: "last_admin" });
  });

  it("wipes the number of a request nobody decided after 30 days", async () => {
    const admin = await rider("Idle Admin");
    const id = await club(admin);
    const j = await rider("Patient");
    await requestJoin(db.sql, { userId: j, clubId: id, phone: "9812345678", now: t0 });
    // created_at is the database's real clock, so measure the 30 days from now rather than from the fixed t0.
    const fromNow = (n: number) => new Date(Date.now() + n * 86_400_000);
    await purgeJoinPhones(db.sql, fromNow(29));
    expect((await phoneInDb(id))[0]).not.toBeNull();
    await purgeJoinPhones(db.sql, fromNow(31));
    expect(await phoneInDb(id)).toEqual([null]);
    expect((await listJoinRequests(db.sql, { userId: admin, clubId: id }, fromNow(31)))!.filter((x) => x.status === "pending")).toEqual([]);
  });
});
});

describe("paging and searching the club list", () => {
  it("walks every club once, newest first, even when several share a creation time", async () => {
    const a = await rider("Pager");
    const made: string[] = [];
    // One rider may only start a few clubs an hour, so each club has its own founder; they all share one creation time `t0`.
    for (let i = 0; i < 7; i++) {
      const r = await createClub(db.sql, { userId: i === 0 ? a : await rider(`Pager ${i}`), name: `Paged Club ${i} ${++n}`, description: "paging", womenOnly: false, now: t0 });
      if (!r.ok) throw new Error(r.reason);
      made.push(r.clubId);
    }
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page = await searchClubs(db.sql, a, { q: "paging", limit: 3, cursor });
      seen.push(...page!.items.map((c) => c.clubId));
      cursor = page!.nextCursor;
    } while (cursor);
    expect(new Set(seen).size).toBe(7);
    expect([...seen].sort()).toEqual([...made].sort());
  });
  it("searches name and description anywhere, takes % and _ literally, and splits mine from the rest", async () => {
    const a = await rider("Searcher"), b = await rider("Other");
    const mine = await createClub(db.sql, { userId: a, name: `Zebra Riders ${++n}`, description: "Sunday 100% fun", womenOnly: false, now: t0 });
    const theirs = await createClub(db.sql, { userId: b, name: `Quokka Crew ${++n}`, description: "weekend loops", womenOnly: false, now: t0 });
    if (!mine.ok || !theirs.ok) throw new Error("setup");
    expect((await searchClubs(db.sql, a, { q: "ZEBRA" }))!.items.map((c) => c.clubId)).toEqual([mine.clubId]);
    expect((await searchClubs(db.sql, a, { q: "weekend loops" }))!.items.map((c) => c.clubId)).toEqual([theirs.clubId]);
    expect((await searchClubs(db.sql, a, { q: "100%" }))!.items.map((c) => c.clubId)).toEqual([mine.clubId]);
    expect((await searchClubs(db.sql, a, { q: "%" }))!.items.map((c) => c.clubId)).toEqual([mine.clubId]);
    expect((await searchClubs(db.sql, a, { scope: "mine", q: "Riders" }))!.items.map((c) => c.clubId)).toContain(mine.clubId);
    expect((await searchClubs(db.sql, a, { scope: "others", q: "Crew" }))!.items.map((c) => c.clubId)).toEqual([theirs.clubId]);
    expect((await searchClubs(db.sql, a, { scope: "others", q: "ZEBRA" }))!.items).toEqual([]);
  });
  it("refuses a cursor it did not write, and shows nothing to a rider who has not finished the welcome step", async () => {
    const a = await rider("Cursor");
    expect(await searchClubs(db.sql, a, { cursor: "garbage" })).toBeNull();
    expect(await searchClubs(db.sql, await rider("Nobody2", { declared: false }), {})).toEqual({ items: [], nextCursor: null });
  });
});
