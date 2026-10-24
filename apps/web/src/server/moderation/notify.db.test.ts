// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { EmailMessage, EmailSender } from "../auth/email";
import { createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { decisionEmail, reportOutcomeEmail, sendToUser } from "./notify";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});
const site = "https://moto-trails.com";

describe("decisionEmail", () => {
  it("tells the contributor a trail is published and links to it", () => {
    const m = decisionEmail({ contributorId: "x", outcome: "approved", title: "Ridge track", slug: "ridge-track" }, site);
    expect(m.subject).toMatch(/published/i);
    expect(m.text).toContain("https://moto-trails.com/trails/ridge-track");
  });
  it("includes the moderator's note and the way back to edit for changes", () => {
    const m = decisionEmail({ contributorId: "x", outcome: "changes_requested", title: "Ridge track", comment: "Please add the gate location." }, site);
    expect(m.text).toContain("Please add the gate location.");
    expect(m.text).toContain("https://moto-trails.com/account/contributions");
  });
  it("is kind and clear on rejection", () => {
    const m = decisionEmail({ contributorId: "x", outcome: "rejected", title: "Ridge track", comment: "Private estate." }, site);
    expect(m.subject).toMatch(/not .*published|update/i);
    expect(m.text).toContain("Private estate.");
  });
  it("never lets a title or note inject headers or links of its own", () => {
    const m = decisionEmail({ contributorId: "x", outcome: "approved", title: "Bad\r\nBcc: evil@example.com", slug: "ok" }, site);
    expect(m.subject).not.toMatch(/[\r\n]/);
  });
});

describe("reportOutcomeEmail", () => {
  it("thanks the reporter and states the outcome", () => {
    expect(reportOutcomeEmail({ reporterId: "x", outcome: "accepted", trailName: "Ridge track", note: "Confirmed." }, site).text).toMatch(/Confirmed\./);
    expect(reportOutcomeEmail({ reporterId: "x", outcome: "rejected", trailName: "Ridge track", note: "" }, site).subject).toMatch(/report/i);
  });
});

describe("sendToUser", () => {
  const capture = () => {
    const sent: EmailMessage[] = [];
    const sender: EmailSender = { send: async (m) => void sent.push(m) };
    return { sent, sender };
  };
  it("sends to the user's address", async () => {
    const id = await makeUser(db.sql);
    const { sent, sender } = capture();
    await sendToUser(db.sql, sender, id, { subject: "Hi", text: "Body" });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toMatch(/@example\.test$/);
  });
  it("does not send to suspended users and never throws when the provider fails", async () => {
    const id = await makeUser(db.sql);
    await db.sql`update app_user set status = 'suspended' where id = ${id}`;
    const { sent, sender } = capture();
    await sendToUser(db.sql, sender, id, { subject: "Hi", text: "Body" });
    expect(sent).toHaveLength(0);
    const ok = await makeUser(db.sql);
    await expect(sendToUser(db.sql, { send: async () => { throw new Error("provider down"); } }, ok, { subject: "Hi", text: "Body" })).resolves.toBeUndefined();
  });
});
