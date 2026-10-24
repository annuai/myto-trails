// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { insertTrailFixture } from "../testing/fixtures";
import { createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { completeWelcome } from "./members";
import { OFFER_TTL_HOURS, REVEAL_WINDOW_SECONDS } from "./constants";
import {
  answerQuestion, askRider, blockAsker, declineQuestion, listBlocked, listQuestions, normalizePhone, offerPhone, purgeExpiredContactShares,
  reportQuestion, revealPhone, unblockRider, withdrawPhoneOffer,
} from "./questions";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const t0 = new Date("2026-10-24T12:00:00Z");
const after = (seconds: number) => new Date(t0.getTime() + seconds * 1000);
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});
const member = async (name: string, pub = true) => {
  const id = await makeUser(db.sql, { name });
  await completeWelcome(db.sql, { userId: id, confirmed: true, displayName: name, profilePublic: pub, isWoman: false });
  const [u] = await db.sql`select public_id from app_user where id = ${id}`;
  return { id, handle: u!.public_id as string };
};
async function answered() {
  const asker = await member("Asker Anil");
  const rider = await member("Rider Rhea");
  const q = await askRider(db.sql, { userId: asker.id, riderId: rider.handle, question: "How was the water crossing?", now: t0 });
  if (!q.ok) throw new Error(q.reason);
  expect(await answerQuestion(db.sql, { userId: rider.id, questionId: q.id, answer: "Knee deep, go slowly.", now: t0 })).toMatchObject({ ok: true });
  return { asker, rider, id: q.id };
}

describe("normalizePhone", () => {
  it.each([
    ["98123 45678", "+919812345678"], ["+91-98123-45678", "+919812345678"], ["919812345678", "+919812345678"], ["09812345678", "+919812345678"], ["+44 7911 123456", "+447911123456"],
  ])("accepts %s", (raw, out) => expect(normalizePhone(raw)).toBe(out));
  it.each([["12345"], ["abcdefghij"], ["5812345678"], ["+0123456789"], [""]])("rejects %j", (raw) => expect(normalizePhone(raw)).toBeNull());
});

describe("askRider", () => {
  it("lets a member ask a public rider and links the trail", async () => {
    const trail = await insertTrailFixture(db.sql, {});
    const a = await member("Ann Asker");
    const r = await member("Rita Rider");
    const q = await askRider(db.sql, { userId: a.id, riderId: r.handle, slug: trail.slug, question: "Is the gate usually open?", now: t0 });
    expect(q).toMatchObject({ ok: true, answererId: r.id });
    const inbox = await listQuestions(db.sql, r.id, t0);
    expect(inbox.received[0]).toMatchObject({ otherName: "Ann Asker", question: "Is the gate usually open?", status: "pending", trailSlug: trail.slug });
    expect((await listQuestions(db.sql, a.id, t0)).sent[0]).toMatchObject({ otherName: "Rita Rider" });
  });

  it("treats private riders, yourself, unknown handles and non-members as not found or refused, identically", async () => {
    const a = await member("Ann Two");
    const priv = await member("Private Pat", false);
    expect(await askRider(db.sql, { userId: a.id, riderId: priv.handle, question: "Can I ask you something?", now: t0 })).toEqual({ ok: false, reason: "not_found" });
    expect(await askRider(db.sql, { userId: a.id, riderId: a.handle, question: "Asking myself a question", now: t0 })).toEqual({ ok: false, reason: "not_found" });
    expect(await askRider(db.sql, { userId: a.id, riderId: crypto.randomUUID(), question: "Anybody out there?", now: t0 })).toEqual({ ok: false, reason: "not_found" });
    expect(await askRider(db.sql, { userId: a.id, riderId: "junk", question: "Anybody out there?", now: t0 })).toEqual({ ok: false, reason: "not_found" });
    const pub = await member("Public Pia");
    expect(await askRider(db.sql, { userId: await makeUser(db.sql), riderId: pub.handle, question: "I never finished sign-up", now: t0 })).toEqual({ ok: false, reason: "not_member" });
  });

  it.each([["x"], ["x".repeat(501)], ["see https://example.com now"]])("rejects the question %j", async (question) => {
    expect(await askRider(db.sql, { userId: (await member("Ann Three")).id, riderId: (await member("Rita Three")).handle, question, now: t0 })).toEqual({ ok: false, reason: "invalid" });
  });

  it("allows one open question per pair, at most five a day, and none after a block either way", async () => {
    const a = await member("Ann Four");
    const r = await member("Rita Four");
    expect(await askRider(db.sql, { userId: a.id, riderId: r.handle, question: "First question here", now: t0 })).toMatchObject({ ok: true });
    expect(await askRider(db.sql, { userId: a.id, riderId: r.handle, question: "Second question here", now: t0 })).toEqual({ ok: false, reason: "already_pending" });
    const others = await Promise.all([1, 2, 3, 4].map((n) => member(`Other ${n}`)));
    for (const o of others) await askRider(db.sql, { userId: a.id, riderId: o.handle, question: "A question for you", now: t0 });
    expect(await askRider(db.sql, { userId: a.id, riderId: (await member("Sixth")).handle, question: "One too many today", now: t0 })).toEqual({ ok: false, reason: "rate_limited" });
    const b = await member("Ann Five");
    const target = await member("Rita Five");
    await db.sql`insert into rider_block (blocker_id, blocked_id) values (${target.id}, ${b.id})`;
    expect(await askRider(db.sql, { userId: b.id, riderId: target.handle, question: "Why am I blocked?", now: t0 })).toEqual({ ok: false, reason: "blocked" });
    await db.sql`insert into rider_block (blocker_id, blocked_id) values (${b.id}, ${target.id}) on conflict do nothing`;
    await db.sql`delete from rider_block where blocker_id = ${target.id}`;
    expect(await askRider(db.sql, { userId: target.id, riderId: (await db.sql`select public_id from app_user where id = ${b.id}`)[0]!.public_id, question: "You blocked me, I think", now: t0 })).toEqual({ ok: false, reason: "blocked" });
  });

  it("lets a question expire after 14 days, after which the pair can ask again", async () => {
    const a = await member("Ann Six");
    const r = await member("Rita Six");
    const q = await askRider(db.sql, { userId: a.id, riderId: r.handle, question: "Anyone home today?", now: t0 });
    if (!q.ok) throw new Error();
    const later = new Date(t0.getTime() + 15 * 86_400_000);
    expect(await answerQuestion(db.sql, { userId: r.id, questionId: q.id, answer: "Late answer here", now: later })).toEqual({ ok: false, reason: "expired" });
    expect((await listQuestions(db.sql, a.id, later)).sent[0]!.status).toBe("expired");
    expect(await askRider(db.sql, { userId: a.id, riderId: r.handle, question: "Trying again now", now: later })).toMatchObject({ ok: true });
  });
});

describe("answering, declining, blocking, reporting", () => {
  it("lets only the person asked answer or decline, once", async () => {
    const a = await member("Ann Seven");
    const r = await member("Rita Seven");
    const q = await askRider(db.sql, { userId: a.id, riderId: r.handle, question: "Which gate did you use?", now: t0 });
    if (!q.ok) throw new Error();
    expect(await answerQuestion(db.sql, { userId: a.id, questionId: q.id, answer: "Answering my own", now: t0 })).toEqual({ ok: false, reason: "not_found" });
    expect(await answerQuestion(db.sql, { userId: r.id, questionId: q.id, answer: "", now: t0 })).toEqual({ ok: false, reason: "invalid" });
    expect(await answerQuestion(db.sql, { userId: r.id, questionId: q.id, answer: "The east gate.", now: t0 })).toMatchObject({ ok: true, askerId: a.id });
    expect(await answerQuestion(db.sql, { userId: r.id, questionId: q.id, answer: "Answering twice", now: t0 })).toEqual({ ok: false, reason: "wrong_state" });
    expect((await listQuestions(db.sql, a.id, t0)).sent[0]).toMatchObject({ status: "answered", answer: "The east gate." });
    const q2 = await askRider(db.sql, { userId: (await member("Ann Eight")).id, riderId: r.handle, question: "Another question", now: t0 });
    if (!q2.ok) throw new Error();
    expect(await declineQuestion(db.sql, { userId: r.id, questionId: q2.id })).toEqual({ ok: true });
    expect(await declineQuestion(db.sql, { userId: r.id, questionId: q2.id })).toEqual({ ok: false, reason: "not_found" });
  });

  it("blocks an asker (declining their pending question and withdrawing any offered number), and unblocks", async () => {
    const { asker, rider, id } = await answered();
    await offerPhone(db.sql, { userId: rider.id, questionId: id, phone: "9812345678", now: t0 });
    expect(await blockAsker(db.sql, { userId: rider.id, questionId: id })).toEqual({ ok: true });
    expect(await listBlocked(db.sql, rider.id)).toEqual([{ blockedId: asker.id, name: "Asker Anil" }]);
    expect(await revealPhone(db.sql, { userId: asker.id, questionId: id, now: after(5) })).toEqual({ ok: false, reason: "expired" });
    expect((await db.sql`select phone_ciphertext, status from contact_share where question_id = ${id}`)[0]).toMatchObject({ phone_ciphertext: null, status: "withdrawn" });
    expect(await askRider(db.sql, { userId: asker.id, riderId: rider.handle, question: "May I ask again?", now: t0 })).toEqual({ ok: false, reason: "blocked" });
    await unblockRider(db.sql, { userId: rider.id, blockedId: asker.id });
    expect(await listBlocked(db.sql, rider.id)).toEqual([]);
  });

  it("lets the person asked report a question: it is declined and a content report is recorded", async () => {
    const a = await member("Ann Nine");
    const r = await member("Rita Nine");
    const q = await askRider(db.sql, { userId: a.id, riderId: r.handle, question: "Send me your number now", now: t0 });
    if (!q.ok) throw new Error();
    expect(await reportQuestion(db.sql, { userId: a.id, questionId: q.id, reason: "I am the asker" })).toEqual({ ok: false, reason: "not_found" });
    expect(await reportQuestion(db.sql, { userId: r.id, questionId: q.id, reason: "ok" })).toEqual({ ok: false, reason: "invalid" });
    expect(await reportQuestion(db.sql, { userId: r.id, questionId: q.id, reason: "Pushy and inappropriate" })).toEqual({ ok: true });
    expect((await db.sql`select status from rider_question where id = ${q.id}`)[0]!.status).toBe("declined");
    expect(await db.sql`select 1 from content_report where subject_type = 'question' and subject_id = ${q.id}`).toHaveLength(1);
  });
});

describe("phone sharing", () => {
  it("is offered by the person asked after answering, stored encrypted, and revealed to the asker for five minutes, then gone for good", async () => {
    const { asker, rider, id } = await answered();
    expect(await offerPhone(db.sql, { userId: rider.id, questionId: id, phone: "98123 45678", now: t0 })).toEqual({ ok: true, askerId: asker.id });
    const [row] = await db.sql`select phone_ciphertext, status from contact_share where question_id = ${id}`;
    expect(row!.status).toBe("offered");
    expect(row!.phone_ciphertext).not.toContain("9812345678");
    expect((await listQuestions(db.sql, asker.id, t0)).sent[0]).toMatchObject({ canReveal: true, share: { state: "offered" } });

    const first = await revealPhone(db.sql, { userId: asker.id, questionId: id, now: after(60) });
    expect(first).toMatchObject({ ok: true, phone: "+919812345678", remainingSeconds: REVEAL_WINDOW_SECONDS });
    const again = await revealPhone(db.sql, { userId: asker.id, questionId: id, now: after(60 + 120) });
    expect(again).toMatchObject({ ok: true, phone: "+919812345678", remainingSeconds: REVEAL_WINDOW_SECONDS - 120 });
    expect(await revealPhone(db.sql, { userId: asker.id, questionId: id, now: after(60 + REVEAL_WINDOW_SECONDS + 1) })).toEqual({ ok: false, reason: "expired" });
    const [gone] = await db.sql`select phone_ciphertext, status from contact_share where question_id = ${id}`;
    expect(gone).toMatchObject({ phone_ciphertext: null, status: "expired" });
    expect(await revealPhone(db.sql, { userId: asker.id, questionId: id, now: after(99999) })).toEqual({ ok: false, reason: "expired" });
  });

  it("only the asker can reveal, only the answerer can offer, and only after answering and only once", async () => {
    const asker = await member("Ann Ten");
    const rider = await member("Rita Ten");
    const q = await askRider(db.sql, { userId: asker.id, riderId: rider.handle, question: "A question awaiting reply", now: t0 });
    if (!q.ok) throw new Error();
    expect(await offerPhone(db.sql, { userId: rider.id, questionId: q.id, phone: "9812345678", now: t0 })).toEqual({ ok: false, reason: "wrong_state" }); // not answered yet
    await answerQuestion(db.sql, { userId: rider.id, questionId: q.id, answer: "Happy to help", now: t0 });
    expect(await offerPhone(db.sql, { userId: asker.id, questionId: q.id, phone: "9812345678", now: t0 })).toEqual({ ok: false, reason: "not_found" });
    expect(await offerPhone(db.sql, { userId: rider.id, questionId: q.id, phone: "12345", now: t0 })).toEqual({ ok: false, reason: "invalid" });
    expect(await offerPhone(db.sql, { userId: rider.id, questionId: q.id, phone: "9812345678", now: t0 })).toMatchObject({ ok: true });
    expect(await offerPhone(db.sql, { userId: rider.id, questionId: q.id, phone: "9812345678", now: t0 })).toEqual({ ok: false, reason: "wrong_state" });
    const stranger = await member("Stranger Sam");
    expect(await revealPhone(db.sql, { userId: stranger.id, questionId: q.id, now: t0 })).toEqual({ ok: false, reason: "not_found" });
    expect(await revealPhone(db.sql, { userId: rider.id, questionId: q.id, now: t0 })).toEqual({ ok: false, reason: "not_found" }); // the sharer is not the recipient
  });

  it("lapses unrevealed offers after 24 hours and wipes the number", async () => {
    const { asker, rider, id } = await answered();
    await offerPhone(db.sql, { userId: rider.id, questionId: id, phone: "9812345678", now: t0 });
    const late = new Date(t0.getTime() + (OFFER_TTL_HOURS * 3600 + 1) * 1000);
    expect(await revealPhone(db.sql, { userId: asker.id, questionId: id, now: late })).toEqual({ ok: false, reason: "expired" });
    expect((await db.sql`select phone_ciphertext from contact_share where question_id = ${id}`)[0]!.phone_ciphertext).toBeNull();
  });

  it("can be withdrawn by the sharer before or during the window, and purged in bulk", async () => {
    const a1 = await answered();
    await offerPhone(db.sql, { userId: a1.rider.id, questionId: a1.id, phone: "9812345678", now: t0 });
    expect(await withdrawPhoneOffer(db.sql, { userId: a1.rider.id, questionId: a1.id })).toEqual({ ok: true });
    expect(await revealPhone(db.sql, { userId: a1.asker.id, questionId: a1.id, now: after(1) })).toEqual({ ok: false, reason: "expired" });
    expect(await withdrawPhoneOffer(db.sql, { userId: a1.asker.id, questionId: a1.id })).toEqual({ ok: false, reason: "not_found" });

    const a2 = await answered();
    await offerPhone(db.sql, { userId: a2.rider.id, questionId: a2.id, phone: "9812345679", now: t0 });
    await revealPhone(db.sql, { userId: a2.asker.id, questionId: a2.id, now: after(10) });
    expect(await purgeExpiredContactShares(db.sql, after(10 + 100))).toBe(0);
    expect(await purgeExpiredContactShares(db.sql, after(10 + REVEAL_WINDOW_SECONDS + 1))).toBe(1);
  });

  it("limits offers to three a day, records only the fact of sharing, and never exposes numbers in the inbox", async () => {
    const rider = await member("Busy Rider");
    for (let i = 0; i < 3; i++) {
      const a = await member(`Asker ${i}`);
      const q = await askRider(db.sql, { userId: a.id, riderId: rider.handle, question: "Can you share a number?", now: t0 });
      if (!q.ok) throw new Error();
      await answerQuestion(db.sql, { userId: rider.id, questionId: q.id, answer: "Sure thing", now: t0 });
      expect(await offerPhone(db.sql, { userId: rider.id, questionId: q.id, phone: `98123456${70 + i}`, now: t0 })).toMatchObject({ ok: true });
    }
    const a4 = await member("Asker Four");
    const q4 = await askRider(db.sql, { userId: a4.id, riderId: rider.handle, question: "And one more please", now: t0 });
    if (!q4.ok) throw new Error();
    await answerQuestion(db.sql, { userId: rider.id, questionId: q4.id, answer: "Sure thing", now: t0 });
    expect(await offerPhone(db.sql, { userId: rider.id, questionId: q4.id, phone: "9812345699", now: t0 })).toEqual({ ok: false, reason: "rate_limited" });
    const logs = JSON.stringify(await db.sql`select * from audit_log where action like 'contact_%'`);
    expect(logs).toContain("contact_offer");
    expect(logs).not.toMatch(/98123456/);
    expect(JSON.stringify(await listQuestions(db.sql, rider.id, t0))).not.toMatch(/98123456|ciphertext|v1\./);
  });
});
